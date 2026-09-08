"""API views for the grading application."""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from assignments.models import Assignment
from authentication.throttle import GradeThrottle
from course.models import Status
from course.permissions import is_teacher
from grading.models import FinalScoreSnapshot, Grade
from grading.permissions import IsCourseTeacherOfAssignment
from grading.serializers import (
    CourseBriefSerializer,
    FinalScoreSnapshotSerializer,
    GradeHistorySerializer,
    GradeSerializer,
    GradeStudentSerializer,
    GradeTeamSerializer,
    UserBriefSerializer,
)
from grading.services import grade_student, grade_team


def _get_gradeable_assignment(request, assignment_id):
    """Resolve an assignment and require the requesting teacher to own it."""
    assignment = get_object_or_404(Assignment, pk=assignment_id)
    if not IsCourseTeacherOfAssignment().has_object_permission(
        request, None, assignment
    ):
        raise PermissionDenied(
            "Only the teacher of the course can grade this assignment."
        )
    return assignment


class GradeTeamView(APIView):
    """Grade all members of a team with the same score."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [GradeThrottle]

    def post(self, request, assignment_id):
        assignment = _get_gradeable_assignment(request, assignment_id)
        serializer = GradeTeamSerializer(
            data=request.data,
            context={"assignment": assignment},
        )
        serializer.is_valid(raise_exception=True)
        grades = grade_team(
            assignment=assignment,
            team=serializer.validated_data["team"],
            score=serializer.validated_data["score"],
            graded_by=request.user,
            overwrite_individual=serializer.validated_data.get(
                "overwrite_individual", False
            ),
        )
        return Response(
            GradeSerializer(
                grades, many=True, context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )


class GradeStudentView(APIView):
    """Create or update the individual grade of a single student."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [GradeThrottle]

    def post(self, request, assignment_id):
        assignment = _get_gradeable_assignment(request, assignment_id)
        serializer = GradeStudentSerializer(
            data=request.data,
            context={"assignment": assignment},
        )
        serializer.is_valid(raise_exception=True)
        grade = grade_student(
            assignment=assignment,
            student=serializer.validated_data["student"],
            score=serializer.validated_data["score"],
            graded_by=request.user,
        )
        return Response(
            GradeSerializer(
                grade, context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )


class GradeViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to grades, scoped by the requesting user.

    Students only ever see their own grades, and only while they keep an
    approved enrollment in the course (removing them hides historical
    grades from the API). Teachers only see grades of assignments that
    belong to their own courses. Grades are created through the
    ``grade-team``/``grade-student`` endpoints, never through this viewset.
    """

    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["assignment", "student"]
    search_fields = [
        "student__username",
        "student__first_name",
        "student__last_name",
        "assignment__title",
    ]
    ordering_fields = ["score", "created_at", "updated_at"]

    def get_serializer_context(self):
        """Only teachers may see whether a grade is individual."""
        context = super().get_serializer_context()
        user = self.request.user
        context["show_grade_origin"] = is_teacher(user)
        return context

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.select_related(
            "assignment__course__teacher",
            "student",
            "graded_by",
        )
        if is_teacher(user):
            return queryset.filter(assignment__course__teacher=user)
        return (
            queryset.filter(
                student=user,
                assignment__course__sections__enrollments__student=user,
                assignment__course__sections__enrollments__status=Status.APPROVED,
                assignment__course__is_active=True,
                assignment__is_published=True,
            )
            .distinct()
        )

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Audit trail (old -> new scores) of a single grade."""
        grade = self.get_object()
        history = grade.history.select_related("graded_by").order_by("created_at")
        return Response(
            GradeHistorySerializer(history, many=True).data
        )

    def _evolution_queryset(self):
        """Evolution points the requesting user is allowed to see."""
        user = self.request.user
        queryset = FinalScoreSnapshot.objects.select_related("course", "student")
        if is_teacher(user):
            return queryset.filter(course__teacher=user)
        return (
            queryset.filter(
                student=user,
                course__sections__enrollments__student=user,
                course__sections__enrollments__status=Status.APPROVED,
                course__is_active=True,
            )
            .distinct()
        )

    @action(detail=False, methods=["get"])
    def evolution(self, request):
        """Time series of a student's final grade for one of their courses.

        Teachers may query ``?course=<id>`` for any of their own courses;
        students always get their own series (optionally filtered the same
        way). The last 30 points are returned in ascending order.
        """
        snapshots = self._evolution_queryset()
        course_id = request.query_params.get("course")
        if course_id:
            snapshots = snapshots.filter(course_id=course_id)

        rows = list(
            snapshots.order_by("-created_at")[:30]
        )
        rows.reverse()

        course = rows[0].course if rows else None
        student = rows[0].student if rows else None
        return Response(
            {
                "course": (
                    CourseBriefSerializer(
                        course, context={"request": request}
                    ).data
                    if course is not None
                    else None
                ),
                "student": (
                    UserBriefSerializer(
                        student, context={"request": request}
                    ).data
                    if student is not None
                    else None
                ),
                "points": FinalScoreSnapshotSerializer(
                    rows, many=True, context={"request": request}
                ).data,
            }
        )
