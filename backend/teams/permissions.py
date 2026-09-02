"""Permission classes for the teams application."""

from rest_framework.permissions import BasePermission


class IsTeamManagerOrTeacher(BasePermission):
    """Allow the course teacher and the team leader to manage a team."""

    message = "Only the course teacher or the team leader can perform this action."

    def has_permission(self, request, view) -> bool:
        """Allow authenticated users through; ownership is checked per object."""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        """Return True for the course teacher or the team leader."""
        course = getattr(obj.section, "course", None)
        is_teacher = bool(course and course.teacher_id == request.user.id)
        return is_teacher or obj.leader_id == request.user.id
