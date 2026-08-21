"""Business logic for grading.

The propagation of a team score to its members lives here instead of inside
``Grade.save()`` so every grading entry point is explicit and safe. Both
functions re-validate ownership and score bounds because they are the
security boundary of the module.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from course.models import Enrollment, Status
from grading.models import Grade


def _validate_grade_params(assignment, score, graded_by):
    """Shared guards used by every grading entry point."""
    if not (graded_by.is_superuser or assignment.course.teacher_id == graded_by.id):
        raise PermissionDenied(
            "Only the teacher of the course can grade this assignment."
        )
    if score is None or score < 0:
        raise ValidationError({"score": "Score cannot be negative."})
    if score > assignment.max_score:
        raise ValidationError(
            {
                "score": (
                    "Score cannot exceed the assignment max score "
                    f"({assignment.max_score})."
                )
            }
        )


@transaction.atomic
def grade_team(*, assignment, team, score, graded_by):
    """Grade every member of a team with the same score.

    Individual grades (``is_individual=True``) are never overwritten: the
    teacher must adjust them explicitly through ``grade_student``. The whole
    operation runs in a single transaction to avoid partial states.
    """
    _validate_grade_params(assignment, score, graded_by)

    if team.section.course_id != assignment.course_id:
        raise ValidationError(
            {"team": "The team must belong to the same course as the assignment."}
        )

    members = list(team.members.select_related("student"))
    if not members:
        raise ValidationError({"team": "The team has no members to grade."})

    member_ids = [member.student_id for member in members]
    existing = {
        grade.student_id: grade
        for grade in Grade.objects.filter(
            assignment=assignment,
            student_id__in=member_ids,
        )
    }

    now = timezone.now()
    grades_to_create = []
    for member in members:
        grade = existing.get(member.student_id)
        if grade is not None and grade.is_individual:
            continue
        if grade is not None:
            grade.score = score
            grade.is_individual = False
            grade.graded_by = graded_by
            grade.updated_at = now
            grade.save(
                update_fields=["score", "is_individual", "graded_by", "updated_at"]
            )
        else:
            grades_to_create.append(
                Grade(
                    assignment=assignment,
                    student_id=member.student_id,
                    score=score,
                    is_individual=False,
                    graded_by=graded_by,
                    created_at=now,
                    updated_at=now,
                )
            )

    if grades_to_create:
        Grade.objects.bulk_create(grades_to_create)

    return (
        Grade.objects.filter(assignment=assignment, student_id__in=member_ids)
        .select_related("assignment__course", "student", "graded_by")
        .order_by("student__username")
    )


@transaction.atomic
def grade_student(*, assignment, student, score, graded_by):
    """Create or update the individual grade of a single student.

    The grade is flagged ``is_individual=True`` so future team re-grades skip
    this student. Other team members are never affected.
    """
    _validate_grade_params(assignment, score, graded_by)

    if not Enrollment.objects.filter(
        section__course=assignment.course,
        student=student,
        status=Status.APPROVED,
    ).exists():
        raise ValidationError(
            {"student": "This student is not an approved member of the course."}
        )

    grade, _ = Grade.objects.update_or_create(
        assignment=assignment,
        student=student,
        defaults={
            "score": score,
            "is_individual": True,
            "graded_by": graded_by,
        },
    )
    return grade
