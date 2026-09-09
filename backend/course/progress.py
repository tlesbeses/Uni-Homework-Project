"""Course-level progress aggregates for the teacher dashboard.

Computes, per published assignment and per approved student, the numbers
the teacher needs to see how the course is going: how many students were
graded, the score distribution, each student's final grade and the
course average. Reuses the same ``scores_by_pair`` pattern as the exporters
so all aggregate views agree on the data.
"""

from statistics import fmean

from assignments.models import Assignment
from authentication.models import User
from course.models import Enrollment, Status
from grading.final import final_grade_for_student
from grading.models import Grade


def _student_name(user) -> str:
    return (
        f"{user.first_name or user.username} {user.last_name or ''}".strip()
    )


def course_progress(course) -> dict:
    """Return the progress payload of ``course`` for its teacher."""
    assignments = list(
        Assignment.objects.filter(
            course=course,
            is_published=True,
        ).order_by("due_date", "id")
    )

    student_ids = list(
        Enrollment.objects.filter(
            section__course=course,
            status=Status.APPROVED,
        )
        .order_by()
        .values_list("student_id", flat=True)
        .distinct()
    )
    users = (
        User.objects.filter(id__in=student_ids)
        .order_by("first_name", "last_name", "username")
    )

    scores = {}
    if student_ids and assignments:
        for grade in Grade.objects.filter(
            assignment__course=course,
            student_id__in=student_ids,
        ).only("student_id", "assignment_id", "score"):
            scores[(grade.student_id, grade.assignment_id)] = float(grade.score)

    assignment_stats = []
    for assignment in assignments:
        values = [
            scores[(student_id, assignment.id)]
            for student_id in student_ids
            if (student_id, assignment.id) in scores
        ]
        assignment_stats.append(
            {
                "id": assignment.id,
                "title": assignment.title,
                "max_score": float(assignment.max_score),
                "graded": len(values),
                "pending": len(student_ids) - len(values),
                "avg": round(fmean(values), 2) if values else None,
                "max": max(values) if values else None,
                "min": min(values) if values else None,
            }
        )

    student_stats = []
    finals = []
    for user in users:
        final = final_grade_for_student(course=course, student=user)
        grade_count = sum(
            1
            for assignment in assignments
            if (user.id, assignment.id) in scores
        )
        student_stats.append(
            {
                "id": user.id,
                "name": _student_name(user),
                "graded_count": grade_count,
                "final": float(final) if final is not None else None,
            }
        )
        if final is not None:
            finals.append(float(final))

    return {
        "course_id": course.id,
        "course_title": course.title,
        "student_count": len(users),
        "overall_avg_final": (
            round(fmean(finals), 2) if finals else None
        ),
        "assignments": assignment_stats,
        "students": student_stats,
    }