"""API views for the teams application."""

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError as DRFValidationError,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from course.models import Course, Enrollment, Status
from teams.models import Team, TeamMember
from teams.permissions import IsTeamManagerOrTeacher
from teams.serializers import (
    AddMemberSerializer,
    ChangeLeaderSerializer,
    TeamMemberSerializer,
    TeamSerializer,
)


class TeamViewSet(viewsets.ModelViewSet):
    """Manage teams and their memberships inside a course."""

    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["course", "name", "leader"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        """Scope teams to the courses the current user can see."""
        user = self.request.user
        queryset = (
            Team.objects.select_related("course__teacher", "leader")
            .prefetch_related("members__student")
        )

        if user.is_superuser:
            return queryset

        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(course__teacher=user)

        enrolled_courses = Enrollment.objects.filter(
            student=user,
            status=Status.APPROVED,
        ).values("course_id")
        
        return queryset.filter(course_id__in=enrolled_courses)

    def get_permissions(self):
        """Require the course teacher or the team leader for write operations.

        Team creation is open to teachers (of their own courses) and to
        students (approved members of the course); the specific eligibility
        is enforced inside ``create``.
        """
        manager_actions = {
            "update",
            "partial_update",
            "destroy",
            "remove_member",
            "change_leader",
        }
        if self.action in manager_actions:
            return [IsAuthenticated(), IsTeamManagerOrTeacher()]
        if self.action == "members" and self.request.method == "POST":
            return [IsAuthenticated(), IsTeamManagerOrTeacher()]
        return [IsAuthenticated()]

    @staticmethod
    def is_teacher(user) -> bool:
        return user.groups.filter(name="Teacher").exists()

    def create(self, request, *args, **kwargs):
        """Restrict team creation to teachers and approved course students.

        Teachers can only create teams in their own courses. Students must be
        approved members of the course and automatically become the leader of
        the team they create. The eligibility check runs before serialization
        so callers receive a 403 (permission) instead of a misleading
        validation error.
        """
        course_id = request.data.get("course_id") or request.data.get("course")
        if course_id is not None:
            try:
                course = Course.objects.get(pk=course_id)
            except Course.DoesNotExist:
                raise NotFound("Course not found.")
            user = request.user
            if not user.is_superuser and self.is_teacher(user):
                if course.teacher_id != user.id:
                    raise PermissionDenied(
                        "You can only create teams in your own courses."
                    )
            elif not user.is_superuser and not Enrollment.objects.filter(
                course=course,
                student=user,
                status=Status.APPROVED,
            ).exists():
                raise PermissionDenied(
                    "You must be an approved member of the course to create a team."
                )

        data = request.data.copy()
        
        if not (request.user.is_superuser or self.is_teacher(request.user)):
            # A student becomes the leader of the team they create.
            data["leader_id"] = request.user.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        """List all members of a team or add a new member."""
        team = self.get_object()

        if request.method == "POST":
            serializer = AddMemberSerializer(
                data=request.data,
                context={**self.get_serializer_context(), "team": team},
            )
            serializer.is_valid(raise_exception=True)
            try:
                member = TeamMember.objects.create(
                    team=team,
                    student=serializer.validated_data["student"],
                )
            except IntegrityError as exc:
                raise DRFValidationError(str(exc)) from exc
            return Response(
                TeamMemberSerializer(member).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            TeamMemberSerializer(team.members.all(), many=True).data
        )

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<student_id>[^/.]+)")
    def remove_member(self, request, pk=None, student_id=None):
        """Remove a student from a team."""
        team = self.get_object()
        membership = get_object_or_404(TeamMember, team=team, student_id=student_id)

        if membership.student_id == team.leader_id:
            raise PermissionDenied(
                "The team leader cannot be removed. Change the leader first."
            )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="change-leader")
    def change_leader(self, request, pk=None):
        """Change the team leader.

        The new leader is automatically added as a member if needed, which
        preserves the "leader must belong to the team" invariant.
        """
        team = self.get_object()

        serializer = ChangeLeaderSerializer(
            data=request.data,
            context={**self.get_serializer_context(), "team": team},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            team.leader = serializer.validated_data["leader"]
            team.save()

        return Response(
            TeamSerializer(team, context=self.get_serializer_context()).data
        )
