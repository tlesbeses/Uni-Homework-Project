"""API views for the assignments application."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from assignments.models import Assignment
from assignments.permissions import IsCourseTeacher
from assignments.serializers import AssignmentSerializer
from course.models import Course, Status


def get_assignments_for_user(user):
    """Scope assignments to the courses the current user can see.

    Teachers only see their own courses; students only see published
    assignments of courses where their enrollment (in any of the course's
    sections) is approved.
    """
    queryset = Assignment.objects.select_related("course__teacher")
    if user.groups.filter(name="Teacher").exists():
        return queryset.filter(course__teacher=user)
    return queryset.filter(
        course__sections__enrollments__student=user,
        course__sections__enrollments__status=Status.APPROVED,
        is_published=True,
    ).distinct()


class AssignmentViewSet(viewsets.ModelViewSet):
    """Manage the assignments of the current user's courses."""

    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course"]

    def get_queryset(self):
        return get_assignments_for_user(self.request.user)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsCourseTeacher()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Restrict creation to the teacher that owns the course."""
        course_id = request.data.get("course")
        if course_id is not None:
            try:
                course = Course.objects.get(pk=course_id)
            except Course.DoesNotExist:
                raise NotFound("Course not found.")
            user = request.user
            if course.teacher_id != user.id:
                raise PermissionDenied(
                    "You can only create assignments for your own courses."
                )
        return super().create(request, *args, **kwargs)


class CourseAssignmentsListAPIView(generics.ListAPIView):
    """List the assignments of a specific course.

    Uses the same permission-aware scoping as the viewset, so students only
    receive published assignments of approved courses and teachers only the
    assignments of their own courses.
    """

    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        course_id = self.kwargs["course_id"]
        return get_assignments_for_user(self.request.user).filter(
            course_id=course_id
        )
