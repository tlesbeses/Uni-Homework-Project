from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_superuser
            or request.user.groups.filter(name="Teacher").exists()
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_superuser
            or request.user.groups.filter(name="Student").exists()
        )


class IsCourseTeacherOfSection(BasePermission):
    """Allow only the teacher that owns the section's course.

    Object-level ownership is checked against ``obj.course.teacher`` so
    foreign teachers and students are rejected.
    """

    message = "Only the teacher of the course can manage its sections."

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
