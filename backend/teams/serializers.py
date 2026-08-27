"""Serializers for the teams application.

All team business rules that need database access are validated here so the
API returns friendly error messages, while ``models.clean()`` provides the
same guarantees for admin/forms usage.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from course.models import Course, Enrollment, Section, Status
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


class SectionBriefSerializer(serializers.ModelSerializer):
    """Compact section representation, including its course."""

    course = CourseBriefSerializer(read_only=True)

    class Meta:
        model = Section
        fields = ["id", "name", "course"]
        read_only_fields = fields


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
            section=team.section,
            student=student,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "This student is not an approved member of the section."
            )

        if TeamMember.objects.filter(
            team__section__course=team.section.course,
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
        """Reject no-op changes and leaders that do not belong to the section."""
        team = self.context["team"]

        if leader == team.leader:
            raise serializers.ValidationError(
                "This student is already the team leader."
            )

        if not Enrollment.objects.filter(
            section=team.section,
            student=leader,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "The new leader must be an approved member of the section."
            )

        other_membership = TeamMember.objects.filter(
            student=leader,
            course=team.section.course_id,
        ).exclude(team=team)
        if other_membership.exists():
            raise serializers.ValidationError(
                "This student already belongs to another team in this course."
            )

        return leader


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for the Team model with nested member information."""

    section = SectionBriefSerializer(read_only=True)
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source="section",
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
            "section",
            "section_id",
            "leader",
            "leader_id",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        """Freeze ``section`` and ``leader`` once a team already exists.

        Sections and leaders are managed through the dedicated endpoints
        (``members`` and ``change-leader``) instead of a generic PATCH.
        """
        fields = super().get_fields()
        if self.instance is not None:
            fields["section_id"].read_only = True
            fields["leader_id"].read_only = True
        return fields

    def validate(self, attrs):
        """Validate name uniqueness and leader enrollment."""
        attrs = super().validate(attrs)

        section = attrs.get("section") or getattr(self.instance, "section", None)
        name = attrs.get("name") or getattr(self.instance, "name", None)

        if section and name:
            duplicates = Team.objects.filter(section=section, name=name)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"name": "A team with this name already exists in this section."}
                )

        leader = attrs.get("leader") or getattr(self.instance, "leader", None)
        if section and leader:
            if not Enrollment.objects.filter(
                section=section,
                student=leader,
                status=Status.APPROVED,
            ).exists():
                raise serializers.ValidationError(
                    {"leader": "The team leader must be an approved member of the section."}
                )
            if self.instance is None and TeamMember.objects.filter(
                team__section__course=section.course,
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
