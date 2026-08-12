"""Serializers for the teams application.

All team business rules that need database access are validated here so the
API returns friendly error messages, while ``models.clean()`` provides the
same guarantees for admin/forms usage.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from course.models import Course, Enrollment, Status
from teams.models import Team, TeamMember

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Compact user representation used inside team payloads."""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class CourseBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title"]


class TeamMemberSerializer(serializers.ModelSerializer):
    student = UserBriefSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ["id", "team", "student", "joined_at"]
        read_only_fields = ["id", "team", "joined_at"]


class AddMemberSerializer(serializers.Serializer):

    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(groups__name='Student'),
        error_messages={"does_not_exist": "Student not found."},
    )

    def validate_student(self, student) -> User:    
        """Enforce the membership business rules for the target team."""
        team = self.context["team"]

        if team.members.filter(student=student).exists():
            raise serializers.ValidationError(
                "This student is already a member of the team."
            )

        if not Enrollment.objects.filter(
            course=team.course,
            student=student,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "This student is not an approved member of the course."
            )

        if TeamMember.objects.filter(
            team__course=team.course,
            student=student,
        ).exclude(team=team).exists():
            raise serializers.ValidationError(
                "This student already belongs to another team in this course."
            )

        return student


class ChangeLeaderSerializer(serializers.Serializer):
    """Validate the payload used to change a team leader."""

    leader = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(groups__name='Student'),
        error_messages={"does_not_exist": "Student not found."},
    )

    def validate_leader(self, leader) -> User:
        """Reject no-op changes and leaders that do not belong to the course."""
        team = self.context["team"]

        if leader == team.leader:
            raise serializers.ValidationError(
                "This student is already the team leader."
            )

        if not Enrollment.objects.filter(
            course=team.course,
            student=leader,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "The new leader must be an approved member of the course."
            )

        return leader


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for the Team model with nested member information."""

    course = CourseBriefSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True,
    )
    leader = UserBriefSerializer(read_only=True)
    leader_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="leader",
        write_only=True,
    )
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "course",
            "course_id",
            "leader",
            "leader_id",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        """Freeze ``course`` and ``leader`` once a team already exists.

        Courses and leaders are managed through the dedicated endpoints
        (``members`` and ``change-leader``) instead of a generic PATCH.
        """
        fields = super().get_fields()
        if self.instance is not None:
            fields["course_id"].read_only = True
            fields["leader_id"].read_only = True
        return fields

    def validate(self, attrs):
        """Validate name uniqueness and leader enrollment."""
        attrs = super().validate(attrs)

        course = attrs.get("course") or getattr(self.instance, "course", None)
        name = attrs.get("name") or getattr(self.instance, "name", None)

        if course and name:
            duplicates = Team.objects.filter(course=course, name=name)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"name": "A team with this name already exists in this course."}
                )

        leader = attrs.get("leader") or getattr(self.instance, "leader", None)
        if course and leader:
            if not Enrollment.objects.filter(
                course=course,
                student=leader,
                status=Status.APPROVED,
            ).exists():
                raise serializers.ValidationError(
                    {"leader": "The team leader must be an approved member of the course."}
                )
            if self.instance is None and TeamMember.objects.filter(
                team__course=course,
                student=leader,
            ).exists():
                raise serializers.ValidationError(
                    {"leader": "This student already belongs to another team in this course."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """Create the team; the leader membership is handled by ``Team.save``."""
        return super().create(validated_data)
