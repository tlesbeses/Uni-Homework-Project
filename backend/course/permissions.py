from django.core.cache import cache
from rest_framework.permissions import BasePermission

GROUP_CACHE_TTL = 300  # 5 minutes


def _has_group(user, group_name):
    cache_key = f"group:{user.pk}:{group_name}"
    result = cache.get(cache_key)
    if result is None:
        result = user.groups.filter(name=group_name).exists()
        cache.set(cache_key, result, GROUP_CACHE_TTL)
    return result


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return _has_group(request.user, "Teacher")


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _has_group(request.user, "Student")


class IsCourseTeacherOfSection(BasePermission):
    """Allow only the teacher that owns the section's course.

    Object-level ownership is checked against ``obj.course.teacher`` so
    foreign teachers and students are rejected.
    """

    message = "Only the teacher of the course can manage its sections."

    def has_permission(self, request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        return _has_group(request.user, "Teacher")

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.course.teacher_id == request.user.id
