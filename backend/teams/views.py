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

from course.models import Enrollment, Section, Status
from course.serializers import EnrollmentSerializer
from teams.models import Team, TeamMember
from teams.permissions import IsTeamManagerOrTeacher
from teams.serializers import (
    AddMemberSerializer,
    ChangeLeaderSerializer,
    TeamMemberSerializer,
    TeamSerializer,
)


class TeamViewSet(viewsets.ModelViewSet):
    """Manage teams and their memberships inside a section."""

    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["section", "name", "leader"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        """Scope teams to the sections the current user can see."""
        user = self.request.user
        queryset = (
            Team.objects.select_related(
                "section__course__teacher",
                "leader",
            )
            .prefetch_related("members__student")
        )

        if user.is_superuser:
            return queryset

        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(section__course__teacher=user)

        enrolled_sections = Enrollment.objects.filter(
            student=user,
            status=Status.APPROVED,
        ).values("section_id")

        return queryset.filter(members__student=user, section_id__in=enrolled_sections,).distinct()

    def get_permissions(self):
        """Require the course teacher or the team leader for write operations.

        Team creation is open to teachers (of their own courses) and to
        students (approved members of the section); the specific eligibility
        is enforced inside ``create``.
        """
        manager_actions = {
            "update",
            "partial_update",
            "destroy",
            "remove_member",
            "change_leader",
            "available_students",
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
        """Restrict team creation to teachers and approved section students.

        Teachers can only create teams in their own courses. Students must be
        approved members of the team's section and automatically become the
        leader of the team they create. The eligibility check runs before
        serialization so callers receive a 403 (permission) instead of a
        misleading validation error.
        """
        section_id = request.data.get("section_id") or request.data.get("section")
        if section_id is not None:
            try:
                section = Section.objects.get(pk=section_id)
            except Section.DoesNotExist:
                raise NotFound("Section not found.")
            user = request.user
            if not user.is_superuser and self.is_teacher(user):
                if section.course.teacher_id != user.id:
                    raise PermissionDenied(
                        "You can only create teams in your own courses."
                    )
            elif not user.is_superuser and not Enrollment.objects.filter(
                section=section,
                student=user,
                status=Status.APPROVED,
            ).exists():
                raise PermissionDenied(
                    "You must be an approved member of the section to create a team."
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

    @action(detail=True, methods=["get"], url_path="available-students")
    def available_students(self, request, pk=None):
        """List approved enrollments of the team's section for member selection."""
        team = self.get_object()
        enrollments = (
            Enrollment.objects.filter(
                section=team.section,
                status=Status.APPROVED,
            )
            .select_related(
                "student",
                "section__course__teacher",
                "section__course__settings",
            )
            .order_by("student__first_name", "student__last_name", "student__username")
        )
        serializer = EnrollmentSerializer(
            enrollments,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

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
