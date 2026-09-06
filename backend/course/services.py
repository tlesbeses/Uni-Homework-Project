"""Business logic for the enrollment lifecycle.

Centralizes the state transitions (request with auto-accept, approve, reject
and delete) that were previously duplicated across the join/enroll actions and
the ``EnrollmentViewSet``, keeping their notifications and audit events next to
the code that causes them.
"""

from django.db import IntegrityError, transaction

from authentication.models import EventLog
from authentication.services import log_event
from course.models import Course, CourseSettings, Enrollment, Status
from notifications.services import (
    notify_enrollment_approved,
    notify_enrollment_requested,
)
from teams.services import remove_student_from_course_teams


class EnrollmentInvalidStateError(Exception):
    """Raised when a transition cannot be applied to the current status."""

    def __init__(self, detail):
        self.detail = detail
        super().__init__(detail)


@transaction.atomic
def create_enrollment(*, section, student, actor):
    """Create an enrollment request, applying auto-accept when configured.

    Fires the matching notification (approved vs requested) and the audit
    event alongside the creation. Returns the created enrollment.
    """
    # Serialize concurrent join/enroll calls for the same course: taking a
    # row lock on the course makes a second simultaneous request wait for the
    # first to commit, so its duplicate check below sees the committed row
    # instead of racing the INSERT.
    Course.objects.select_for_update().get(pk=section.course_id)

    if Enrollment.objects.filter(
        section__course=section.course,
        student=student,
    ).exclude(status=Status.REJECTED).exists():
        raise EnrollmentInvalidStateError(
            "You already requested to join this course."
        )

    try:
        enrollment = Enrollment.objects.create(section=section, student=student)
    except IntegrityError:
        # Backends without row locks (e.g. SQLite) can still let two requests
        # reach the INSERT: the unique constraint protects the invariant, and
        # here we convert the resulting IntegrityError into the same business
        # error instead of a 500.
        if Enrollment.objects.filter(
            section__course=section.course,
            student=student,
        ).exists():
            raise EnrollmentInvalidStateError(
                "You already requested to join this course."
            ) from None
        raise

    course_settings, _ = CourseSettings.objects.get_or_create(
        course=section.course
    )
    if course_settings.auto_accept_students:
        enrollment.status = Status.APPROVED
        enrollment.save()

    if enrollment.status == Status.APPROVED:
        notify_enrollment_approved(enrollment=enrollment)
    else:
        notify_enrollment_requested(
            enrollment=enrollment,
            course=section.course,
            section=section,
        )

    log_event(
        actor=actor,
        action=EventLog.ACTION_CREATE,
        entity_type="enrollment",
        entity_id=enrollment.pk,
        target=enrollment.student,
        metadata={
            "course_id": section.course_id,
            "section_id": section.pk,
            "student_id": enrollment.student_id,
            "status": enrollment.status,
        },
    )

    return enrollment


def approve_enrollment(*, enrollment, actor):
    """Approve an enrollment, notifying the student and auditing the change."""
    if enrollment.status == Status.APPROVED:
        raise EnrollmentInvalidStateError("Enrollment is already approved.")

    enrollment.status = Status.APPROVED
    enrollment.save()

    notify_enrollment_approved(enrollment=enrollment)

    log_event(
        actor=actor,
        action=EventLog.ACTION_UPDATE,
        entity_type="enrollment",
        entity_id=enrollment.pk,
        target=enrollment.student,
        metadata={
            "course_id": enrollment.section.course_id,
            "student_id": enrollment.student_id,
            "status": enrollment.status,
        },
    )

    return enrollment


def reject_enrollment(*, enrollment, actor):
    """Reject an enrollment, detaching an approved student from course teams."""
    if enrollment.status == Status.REJECTED:
        raise EnrollmentInvalidStateError("Enrollment is already rejected.")

    with transaction.atomic():
        # Revoking an approval must also detach the student from the course
        # teams, mirroring an enrollment deletion.
        if enrollment.status == Status.APPROVED:
            remove_student_from_course_teams(
                student=enrollment.student,
                course=enrollment.section.course,
            )
        enrollment.status = Status.REJECTED
        enrollment.approved_at = None
        enrollment.save()

    log_event(
        actor=actor,
        action=EventLog.ACTION_UPDATE,
        entity_type="enrollment",
        entity_id=enrollment.pk,
        target=enrollment.student,
        metadata={
            "course_id": enrollment.section.course_id,
            "student_id": enrollment.student_id,
            "status": enrollment.status,
        },
    )

    return enrollment


def delete_enrollment(*, enrollment, actor):
    """Delete an enrollment, detaching an approved student from course teams."""
    student = enrollment.student
    with transaction.atomic():
        if enrollment.status == Status.APPROVED:
            remove_student_from_course_teams(
                student=student,
                course=enrollment.section.course,
            )
        course_id = enrollment.section.course_id
        student_id = enrollment.student_id
        status_before = enrollment.status
        enrollment_id = enrollment.pk
        enrollment.delete()

    log_event(
        actor=actor,
        action=EventLog.ACTION_DELETE,
        entity_type="enrollment",
        entity_id=enrollment_id,
        target=student,
        metadata={
            "course_id": course_id,
            "student_id": student_id,
            "status": status_before,
        },
    )