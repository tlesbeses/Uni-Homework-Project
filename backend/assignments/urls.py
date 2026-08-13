"""URL configuration for the assignments application."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from assignments.views import AssignmentViewSet, CourseAssignmentsListAPIView

router = DefaultRouter()
router.register("assignments", AssignmentViewSet, basename="assignment")

urlpatterns = [
    path(
        "courses/<int:course_id>/assignments/",
        CourseAssignmentsListAPIView.as_view(),
        name="course-assignments",
    ),
] + router.urls
