"""URL configuration for the grading application."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from grading.views import GradeStudentView, GradeTeamView, GradeViewSet

router = DefaultRouter()
router.register("grades", GradeViewSet, basename="grade")

urlpatterns = [
    path(
        "assignments/<int:assignment_id>/grade-team/",
        GradeTeamView.as_view(),
        name="assignment-grade-team",
    ),
    path(
        "assignments/<int:assignment_id>/grade-student/",
        GradeStudentView.as_view(),
        name="assignment-grade-student",
    ),
] + router.urls
