"""Weighted final-grade computation.

The final grade of a student in a course is a weighted average:

        final = Σ(score × weight) / Σ(max × weight) × 100

Every published assignment counts, whether or not it has been graded yet.
Ungraded assignments count as zero unless ``UNGRADED_COUNTS_AS_ZERO`` is
flipped to ``False`` (then they are ignored entirely). Courses without any
published assignment have no final grade (None).
"""

from decimal import Decimal

from assignments.models import Assignment
from grading.models import Grade


UNGRADED_COUNTS_AS_ZERO = True

_ROUNDING = Decimal("0.01")


def final_grade_for_student(*, course, student):
    """Return the weighted final grade (0..100) of ``student`` in ``course``.

    Returns ``None`` when the course has no published assignments.
    """
    assignments = (
        Assignment.objects.filter(
            course=course,
            is_published=True,
        )
        .only("id", "max_score", "weight")
        .order_by("due_date", "id")
    )
    if not assignments.exists():
        return None

    scores = dict(
        Grade.objects.filter(
            assignment__course=course,
            student=student,
        ).values_list("assignment_id", "score")
    )

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

    final = (score_weight_sum / max_weight_sum) * Decimal("100")
    return final.quantize(_ROUNDING)