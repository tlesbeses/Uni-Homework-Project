"""Business logic for grading.

The propagation of a team score to its members lives here instead of inside
``Grade.save()`` so every grading entry point is explicit and safe. Both
functions re-validate ownership and score bounds because they are the
security boundary of the module.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from authentication.models import EventLog
from authentication.services import log_event
from course.models import Enrollment, Status
from grading.models import Grade


def _validate_grade_params(assignment, score, graded_by):
    """Shared guards used by every grading entry point."""
    if assignment.course.teacher_id != graded_by.id:
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
def grade_team(
    *,
    assignment,
    team,
    score,
    graded_by,
    overwrite_individual=False,
):
    """Grade every active member of a team with the same score.

    Students without an approved enrollment in the course are skipped (and
    any grades they already have are left untouched). Individual grades
    (``is_individual=True``) are preserved unless ``overwrite_individual``
    is set, in which case the team score replaces every member's grade and
    their grades become non-individual again. The whole operation runs in a
    single transaction to avoid partial states.
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
    approved_member_ids = set(
        Enrollment.objects.filter(
            section__course_id=assignment.course_id,
            status=Status.APPROVED,
            student_id__in=member_ids,
        ).values_list("student_id", flat=True)
    )
    if not approved_member_ids:
        raise ValidationError(
            {
                "team": (
                    "The team has no members with an approved enrollment "
                    "in this course."
                )
            }
        )
    existing = {
        grade.student_id: grade
        for grade in Grade.objects.filter(
            assignment=assignment,
            student_id__in=member_ids,
        )
    }

    now = timezone.now()
    grades_to_create = []
    grades_updated = 0
    for member in members:
        if member.student_id not in approved_member_ids:
            continue
        grade = existing.get(member.student_id)
        if (
            grade is not None
            and grade.is_individual
            and not overwrite_individual
        ):
            continue
        if grade is not None:
            grade.score = score
            grade.is_individual = False
            grade.graded_by = graded_by
            grade.updated_at = now
            grade.save(
                update_fields=["score", "is_individual", "graded_by", "updated_at"]
            )
            grades_updated += 1
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

    log_event(
        actor=graded_by,
        action=EventLog.ACTION_UPDATE,
        entity_type="grade",
        entity_id=assignment.id,
        target=team.leader,
        metadata={
            "assignment_id": assignment.id,
            "team_id": team.id,
            "team_name": team.name,
            "score": str(score),
            "member_ids": sorted(approved_member_ids),
            "affected": len(grades_to_create) + grades_updated,
        },
    )

    return (
        Grade.objects.filter(
            assignment=assignment,
            student_id__in=approved_member_ids,
        )
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

    log_event(
        actor=graded_by,
        action=EventLog.ACTION_UPDATE,
        entity_type="grade",
        entity_id=grade.id,
        target=student,
        metadata={
            "assignment_id": assignment.id,
            "score": str(grade.score),
            "is_individual": True,
        },
    )

    return grade
