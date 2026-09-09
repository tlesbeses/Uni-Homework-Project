"""Final-grade computation.

Default (weighted average):

        final = Σ(score × weight) / Σ(max × weight) × 100

Every published assignment counts, whether or not it has been graded yet.
Ungraded assignments count as zero unless ``UNGRADED_COUNTS_AS_ZERO`` is
flipped to ``False`` (then they are ignored entirely). Courses without any
published assignment have no final grade (None).

Ponderación scheme (activated per course through ``CourseSettings.
ponderacion_enabled``):

        final = Σ_p [ acum_pct_p × avg_acum(p) + exam_pct_p × avg_exam(p) ]

``avg_acum`` and ``avg_exam`` reuse the same relative-weight formula
(Σ score×weight / Σ max×weight) restricted to the assignments of that
(bucket, category), so each assignment counts with its ``weight``. The four
configured percentages of a course add up to 100.

Each partial can also be reported on its own, always out of 100: its
categories with published assignments share the 100 proportionally to their
configured percentages (see ``ponderated_parcial_scores_for_student``), so a
course only populated in partial 1 still shows that partial as a 0..100
grade while the combined final grade is capped by the available buckets.
"""

from decimal import Decimal

from assignments.models import Assignment
from course.models import CourseSettings
from grading.models import Grade


UNGRADED_COUNTS_AS_ZERO = True

_ROUNDING = Decimal("0.01")

_ACUMULADO = Assignment.ACUMULADO if hasattr(Assignment, "ACUMULADO") else "ACUMULADO"
_EXAMEN = "EXAMEN"
_PRIMERO = "PRIMERO"
_SEGUNDO = "SEGUNDO"


def _published_assignments(*, course):
    return (
        Assignment.objects.filter(
            course=course,
            is_published=True,
        )
        .only("id", "max_score", "weight", "category", "parcial")
        .order_by("due_date", "id")
    )


def _scores_by_assignment(*, course, student):
    return dict(
        Grade.objects.filter(
            assignment__course=course,
            student=student,
        ).values_list("assignment_id", "score")
    )


def _weighted_average_percentage(assignments, scores):
    """Σ(score×weight)/Σ(max×weight)×100 over ``assignments``."""
    score_weight_sum = Decimal("0")
    max_weight_sum = Decimal("0")
    for assignment in assignments:
        weight = assignment.weight or Decimal("1.00")
        score = scores.get(assignment.id)
        if score is None and not UNGRADED_COUNTS_AS_ZERO:
            continue
        max_weight_sum += assignment.max_score * weight
        score_weight_sum += (score or Decimal("0")) * weight

    if max_weight_sum <= 0:
        return None
    return (score_weight_sum / max_weight_sum) * Decimal("100")


def _ponderacion_percentages(settings):
    """Map each (category, parcial) bucket to its configured percentage."""
    return {
        (_ACUMULADO, _PRIMERO): settings.p1_acumulado_pct or Decimal("0"),
        (_EXAMEN, _PRIMERO): settings.p1_examen_pct or Decimal("0"),
        (_ACUMULADO, _SEGUNDO): settings.p2_acumulado_pct or Decimal("0"),
        (_EXAMEN, _SEGUNDO): settings.p2_examen_pct or Decimal("0"),
    }


def _effective_settings(course):
    """Return the course settings with a fresh database query.

    The reverse OneToOne accessor on the ``course`` instance caches the
    related row, which can go stale when the settings are edited after the
    course was loaded. Re-querying here keeps every computation current.
    """
    return CourseSettings.objects.filter(course=course).first()


def ponderated_breakdown_for_student(*, course, student):
    """Return the components of the ponderated final grade.

    Each item describes one (category, parcial) bucket that has at least one
    published assignment:

        {
            "type": "ACUMULADO" | "EXAMEN",
            "parcial": "PRIMERO" | "SEGUNDO",
            "pct": "15.00",
            "average": "77.50",
            "assignments": 3,
        }

    ``pct`` is the configured percentage and ``average`` the percentage
    score of the bucket (both categories weighted by each assignment's
    ``weight``, like the plain final grade).
    Returns an empty list when the course has no published assignments.
    """
    settings = _effective_settings(course)
    if settings is None:
        return []
    percentages = _ponderacion_percentages(settings)
    buckets = {key: [] for key in percentages}
    for assignment in _published_assignments(course=course):
        key = (assignment.category, assignment.parcial)
        if key in buckets:
            buckets[key].append(assignment)

    if not any(buckets.values()):
        return []

    scores = _scores_by_assignment(course=course, student=student)
    components = []
    for (category, parcial), pct in percentages.items():
        bucket = buckets[(category, parcial)]
        if not bucket:
            continue
        average = _weighted_average_percentage(bucket, scores)
        components.append(
            {
                "type": category,
                "parcial": parcial,
                "pct": str(pct.quantize(Decimal("0.01"))),
                "average": (
                    str(average.quantize(Decimal("0.01"))) if average is not None else None
                ),
                "assignments": len(bucket),
            }
        )
    return components


def ponderated_final_grade_for_student(*, course, student):
    """Return the ponderated final grade (0..100) of ``student``.

    Contributions only come from buckets with published assignments;
    ``None`` when there is nothing to grade yet.
    """
    percentages = _ponderacion_percentages(_effective_settings(course))
    buckets = {key: [] for key in percentages}
    for assignment in _published_assignments(course=course):
        key = (assignment.category, assignment.parcial)
        if key in buckets:
            buckets[key].append(assignment)

    if not any(buckets.values()):
        return None

    scores = _scores_by_assignment(course=course, student=student)
    total = Decimal("0")
    contributed = False
    for (category, parcial), pct in percentages.items():
        bucket = buckets[(category, parcial)]
        if not bucket:
            continue
        average = _weighted_average_percentage(bucket, scores)
        if average is None:
            continue
        contributed = True
        total += average * (pct / Decimal("100"))

    if not contributed:
        return None
    return total.quantize(_ROUNDING)


def ponderated_parcial_scores_for_student(*, course, student):
    """Return the ponderated grade of each partial, always out of 100.

    Each partial rescales its own categories (acumulados/exámenes) that
    have published assignments, so the partial reads as a plain 0..100:

        parcial(P) = Σ (pct_cat × avg_cat) / Σ pct_cat

    A category without published assignments is excluded from both the
    numerator and the denominator (the partial shares its 100 only between
    the categories that exist). A published-but-ungraded assignment still
    counts as zero (see ``UNGRADED_COUNTS_AS_ZERO``). Returns None for both
    partials when the course has no settings or ponderación is disabled,
    and for partials without any published assignment.
    """
    settings = _effective_settings(course)
    if settings is None or not settings.ponderacion_enabled:
        return {_PRIMERO: None, _SEGUNDO: None}
    percentages = _ponderacion_percentages(settings)
    buckets = {key: [] for key in percentages}
    for assignment in _published_assignments(course=course):
        key = (assignment.category, assignment.parcial)
        if key in buckets:
            buckets[key].append(assignment)

    scores = _scores_by_assignment(course=course, student=student)
    result = {}
    for parcial in (_PRIMERO, _SEGUNDO):
        weighted_sum = Decimal("0")
        weight_sum = Decimal("0")
        for category in (_ACUMULADO, _EXAMEN):
            bucket = buckets[(category, parcial)]
            if not bucket:
                continue
            pct = percentages[(category, parcial)]
            average = _weighted_average_percentage(bucket, scores)
            if average is None:
                continue
            weight_sum += pct
            weighted_sum += average * pct
        if weight_sum <= 0:
            result[parcial] = None
        else:
            result[parcial] = (weighted_sum / weight_sum).quantize(_ROUNDING)
    return result


def _weighted_final_grade(*, course, student):
    """Return the plain weighted final grade (0..100) of ``student``.

    Returns ``None`` when the course has no published assignments.
    """
    assignments = _published_assignments(course=course)
    if not assignments.exists():
        return None

    scores = _scores_by_assignment(course=course, student=student)
    average = _weighted_average_percentage(assignments, scores)
    if average is None:
        return None
    return average.quantize(_ROUNDING)


def final_grade_for_student(*, course, student):
    """Return the final grade (0..100) of ``student`` in ``course``.

    Uses the ponderated scheme when the course has it enabled, otherwise the
    plain weighted average. Returns ``None`` when there is nothing graded
    (no published assignments).
    """
    settings = _effective_settings(course)
    if settings is not None and settings.ponderacion_enabled:
        return ponderated_final_grade_for_student(course=course, student=student)
    return _weighted_final_grade(course=course, student=student)