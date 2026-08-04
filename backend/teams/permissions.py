"""Permission classes for the teams application."""

from rest_framework.permissions import BasePermission


class IsCourseTeacher(BasePermission):
    """Allow access only when the requester owns the target team's course."""

    message = "Only the course teacher can perform this action."

    def has_permission(self, request, view) -> bool:
        """Allow authenticated users through; ownership is checked per object."""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        """Return True only for the teacher who owns the team's course."""
        if request.user.is_superuser:
            return True
        course = getattr(obj, "course", None)
        return bool(course and course.teacher_id == request.user.id)
