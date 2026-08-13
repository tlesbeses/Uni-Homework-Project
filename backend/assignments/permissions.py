"""Permission classes for the assignments application."""

from rest_framework.permissions import BasePermission


class IsCourseTeacher(BasePermission):
    """Allow the teacher who owns the course to manage its assignments.

    Object-level ownership is checked against ``obj.course.teacher`` so
    foreign teachers and students are rejected.
    """

    message = "Only the teacher of the course can perform this action."

    def has_permission(self, request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return request.user.groups.filter(name="Teacher").exists()

    def has_object_permission(self, request, view, obj) -> bool:
        if request.user.is_superuser:
            return True
        return obj.course.teacher_id == request.user.id
