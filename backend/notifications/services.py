"""Notification creation helpers.

The triggers live inside the existing write paths (views/services) right
next to the ``log_event`` audit calls, so every notification is explicit,
testable and transactional with its cause. The ``enrollment_approved`` /
``enrollment_requested`` triggers are centralized here so the manual and the
auto-accept flows share the exact same payload shape.
"""

from notifications.models import Notification, NotificationType


def notify_enrollment_approved(*, enrollment):
    """Notify the student that their enrollment in a course was approved."""
    course = enrollment.section.course
    return Notification.objects.create(
        recipient=enrollment.student,
        type=NotificationType.ENROLLMENT_APPROVED,
        payload={
            "course_id": course.id,
            "course_title": course.title,
            "section_id": enrollment.section_id,
            "section_name": enrollment.section.name,
            "enrollment_id": enrollment.pk,
        },
    )


def notify_enrollment_requested(*, enrollment, course=None, section=None):
    """Notify the course teacher that a student requested to join."""
    course = course or enrollment.section.course
    section = section or enrollment.section
    return Notification.objects.create(
        recipient=course.teacher,
        type=NotificationType.ENROLLMENT_REQUESTED,
        payload={
            "course_id": course.id,
            "course_title": course.title,
            "section_id": section.pk,
            "section_name": section.name,
            "enrollment_id": enrollment.pk,
            "student_id": enrollment.student_id,
            "student_name": (
                f"{enrollment.student.first_name or ''} "
                f"{enrollment.student.last_name or ''}".strip()
                or enrollment.student.username
            ),
        },
    )


def notify_grade_published(*, assignment, student_id, score=None):
    """Notify a single student that a grade on an assignment was published."""
    return Notification.objects.create(
        recipient_id=student_id,
        type=NotificationType.GRADE_PUBLISHED,
        payload={
            "assignment_id": assignment.id,
            "assignment_title": assignment.title,
            "course_id": assignment.course_id,
            "course_title": assignment.course.title,
            "score": score,
        },
    )


def notify_grades_published(*, assignment, student_ids, score=None):
    """Notify many students at once that their grade was published."""
    if not student_ids:
        return 0
    return len(
        Notification.objects.bulk_create(
            Notification(
                recipient_id=student_id,
                type=NotificationType.GRADE_PUBLISHED,
                payload={
                    "assignment_id": assignment.id,
                    "assignment_title": assignment.title,
                    "course_id": assignment.course_id,
                    "course_title": assignment.course.title,
                    "score": score,
                },
            )
            for student_id in student_ids
        )
    )