"""Final-grade computation.

Default (average over available points):

        final = Σ(score) / Σ(max) × 100

Every published assignment counts, whether or not it has been graded yet.
Ungraded assignments count as zero unless ``UNGRADED_COUNTS_AS_ZERO`` is
flipped to ``False`` (then they are ignored entirely). Courses without any
published assignment have no final grade (None).

Ponderación scheme (activated per course through ``CourseSettings.
ponderacion_enabled``):

        final = Σ_p [ acum_pct_p × avg_acum(p) + exam_pct_p × avg_exam(p) ]

``avg_acum`` and ``avg_exam`` reuse the same formula (Σ score / Σ max)
restricted to the assignments of that (bucket, category). The four
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
        .only("id", "max_score", "category", "parcial")
        .order_by("due_date", "id")
    )


def _scores_by_assignment(*, course, student):
    return dict(
        Grade.objects.filter(
            assignment__course=course,
            student=student,
        ).values_list("assignment_id", "score")
    )


def _average_percentage(assignments, scores):
    """Σ(score)/Σ(max)×100 over ``assignments``."""
    score_sum = Decimal("0")
    max_sum = Decimal("0")
    for assignment in assignments:
        score = scores.get(assignment.id)
        if score is None and not UNGRADED_COUNTS_AS_ZERO:
            continue
        max_sum += assignment.max_score
        score_sum += score or Decimal("0")

    if max_sum <= 0:
        return None
    return (score_sum / max_sum) * Decimal("100")


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
    score of the bucket (like the plain final grade).
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
        average = _average_percentage(bucket, scores)
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
        average = _average_percentage(bucket, scores)
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
        pct_numerator = Decimal("0")
        pct_denominator = Decimal("0")
        for category in (_ACUMULADO, _EXAMEN):
            bucket = buckets[(category, parcial)]
            if not bucket:
                continue
            pct = percentages[(category, parcial)]
            average = _average_percentage(bucket, scores)
            if average is None:
                continue
            pct_denominator += pct
            pct_numerator += average * pct
        if pct_denominator <= 0:
            result[parcial] = None
        else:
            result[parcial] = (pct_numerator / pct_denominator).quantize(
                _ROUNDING
            )
    return result


def _plain_final_grade(*, course, student):
    """Return the plain final average (0..100) of ``student``.

    Returns ``None`` when the course has no published assignments.
    """
    assignments = _published_assignments(course=course)
    if not assignments.exists():
        return None

    scores = _scores_by_assignment(course=course, student=student)
    average = _average_percentage(assignments, scores)
    if average is None:
        return None
    return average.quantize(_ROUNDING)


def final_grade_for_student(*, course, student):
    """Return the final grade (0..100) of ``student`` in ``course``.

    Uses the ponderated scheme when the course has it enabled, otherwise the
    plain average over available points. Returns ``None`` when there is
    nothing graded (no published assignments).
    """
    settings = _effective_settings(course)
    if settings is not None and settings.ponderacion_enabled:
        return ponderated_final_grade_for_student(course=course, student=student)
    return _plain_final_grade(course=course, student=student)