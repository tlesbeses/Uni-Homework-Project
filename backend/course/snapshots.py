"""Snapshot capture for deleted sections.

``capture_section_snapshot`` is called from the ``pre_delete`` signal of
``Section`` (and of its course through the cascade) so the data of a section
survives its deletion as an immutable, fully denormalized JSON payload.

It never raises: if building the payload fails, a degraded snapshot with the
header data plus a ``capture_error`` note is stored anyway so the deletion is
never blocked and a record always exists.
"""

from datetime import date, datetime
from decimal import Decimal

from django.db.models import QuerySet

from assignments.models import Assignment
from course.models import Course, Enrollment, Section, SectionSnapshot, Status
from grading.final import final_grade_for_student
from grading.models import Grade


def _origin_is_course(origin) -> bool:
    """Whether a deletion started from a Course (Model or QuerySet).

    Django passes the ``origin`` of the collection to every ``pre_delete``
    signal, so a cascade delete of a course reports the Course instance (or
    a QuerySet of Course), regardless of the signal ordering.
    """
    if origin is None:
        return False
    if isinstance(origin, Course):
        return True
    return isinstance(origin, QuerySet) and origin.model is Course


def _json_safe(value):
    """Return ``value`` as something a JSON column can store."""
    if isinstance(value, (Decimal, date, datetime)):
        return str(value)
    return value


def _user_brief(user):
    name = f"{user.first_name or user.username} {user.last_name or ''}".strip()
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": name,
    }


def _student_label(student):
    return f"{student.first_name or student.username} {student.last_name or ''}".strip()


def _build_payload(section):
    course = section.course
    students = list(
        Enrollment.objects.filter(section=section)
        .select_related("student")
        .order_by("student__first_name", "student__last_name", "student__username")
    )
    assignments = list(
        Assignment.objects.filter(course=course).order_by("due_date", "id")
    )
    teams = list(section.teams.prefetch_related("members__student").order_by("name"))

    approved_student_ids = [
        e.student_id for e in students if e.status == Status.APPROVED
    ]
    assignment_ids = [a.id for a in assignments]

    grades = []
    if approved_student_ids and assignment_ids:
        grades = list(
            Grade.objects.filter(
                assignment_id__in=assignment_ids,
                student_id__in=approved_student_ids,
            ).values_list("assignment_id", "student_id", "score", "is_individual")
        )

    members_by_team = {}
    for team in teams:
        members_by_team[team.id] = [
            _user_brief(member.student)
            for member in sorted(team.members.all(), key=lambda m: m.student.first_name)
        ]

    final_scores = []
    for enrollment in students:
        if enrollment.status != Status.APPROVED:
            continue
        score = final_grade_for_student(course=course, student=enrollment.student)
        final_scores.append(
            {
                "student_id": enrollment.student_id,
                "name": _student_label(enrollment.student),
                "username": enrollment.student.username,
                "score": _json_safe(score),
            }
        )

    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "visibility": course.visibility,
            "is_active": course.is_active,
        },
        "section": {
            "id": section.id,
            "name": section.name,
        },
        "teacher": _user_brief(course.teacher),
        "enrollments": [
            {
                "student_id": e.student_id,
                "username": e.student.username,
                "first_name": e.student.first_name,
                "last_name": e.student.last_name,
                "status": e.status,
                "approved_at": _json_safe(e.approved_at),
                "created_at": _json_safe(e.created_at),
            }
            for e in students
        ],
        "teams": [
            {
                "id": team.id,
                "name": team.name,
                "leader": _user_brief(team.leader),
                "members": members_by_team.get(team.id, []),
            }
            for team in teams
        ],
        "assignments": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "max_score": _json_safe(a.max_score),
                "weight": _json_safe(a.weight),
                "due_date": _json_safe(a.due_date),
                "is_published": a.is_published,
            }
            for a in assignments
        ],
        "grades": [
            {
                "assignment_id": assignment_id,
                "student_id": student_id,
                "score": _json_safe(score),
                "is_individual": is_individual,
            }
            for assignment_id, student_id, score, is_individual in grades
        ],
        "final_grades": final_scores,
        "stats": {
            "approved_students": len(approved_student_ids),
            "total_requests": len(students),
            "teams": len(teams),
            "assignments": len(assignments),
            "grades": len(grades),
        },
    }


def capture_section_snapshot(section, *, origin=None):
    """Persist an immutable snapshot of ``section`` before it is deleted.

    ``origin`` is the Django delete origin (Model or QuerySet): when the
    deletion starts on the course, the snapshot reason is ``course_delete``,
    otherwise ``section_delete``.

    Never raises: any capture failure is stored inside the snapshot itself
    as ``payload.capture_error`` so the cascade deletion keeps going.
    """
    reason = (
        SectionSnapshot.REASON_COURSE_DELETE
        if _origin_is_course(origin)
        else SectionSnapshot.REASON_SECTION_DELETE
    )
    try:
        payload = _build_payload(section)
    except Exception as exc:  # pragma: no cover - defensive fallback
        payload = {"capture_error": f"{type(exc).__name__}: {exc}"}

    SectionSnapshot.objects.create(
        course_id=section.course_id,
        course_title=section.course.title,
        teacher_id=section.course.teacher_id,
        teacher_name=section.course.teacher.username,
        section_id=section.pk,
        section_name=section.name,
        reason=reason,
        payload=payload,
    )