"""Serializers for the grading application.

The write serializers only accept ``team``/``student`` and ``score``. The
``graded_by`` teacher is never read from the client; the service layer sets
it from ``request.user``.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from assignments.models import Assignment
from course.models import Course, Enrollment, Status
from grading.models import Grade
from teams.models import Team

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Compact user representation used inside grade payloads."""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class CourseBriefSerializer(serializers.ModelSerializer):
    """Compact course representation used inside grade payloads."""

    class Meta:
        model = Course
        fields = ["id", "title"]


class AssignmentBriefSerializer(serializers.ModelSerializer):
    """Compact assignment representation used inside grade payloads."""

    course = CourseBriefSerializer(read_only=True)

    class Meta:
        model = Assignment
        fields = ["id", "title", "max_score", "course"]


class GradeSerializer(serializers.ModelSerializer):
    """Read-only representation of a Grade."""

    assignment = AssignmentBriefSerializer(read_only=True)
    student = UserBriefSerializer(read_only=True)
    graded_by = UserBriefSerializer(read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id",
            "assignment",
            "student",
            "score",
            "is_individual",
            "graded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class GradeTeamSerializer(serializers.Serializer):
    """Validate the payload used to grade a whole team."""

    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
    score = serializers.DecimalField(max_digits=6, decimal_places=2)

    def validate_score(self, score):
        assignment = self.context["assignment"]
        if score < 0:
            raise serializers.ValidationError("Score cannot be negative.")
        if score > assignment.max_score:
            raise serializers.ValidationError(
                "Score cannot exceed the assignment max score "
                f"({assignment.max_score})."
            )
        return score

    def validate_team(self, team):
        assignment = self.context["assignment"]
        if team.course_id != assignment.course_id:
            raise serializers.ValidationError(
                "The team must belong to the same course as the assignment."
            )
        if not team.members.exists():
            raise serializers.ValidationError("The team has no members to grade.")
        return team


class GradeStudentSerializer(serializers.Serializer):
    """Validate the payload used to grade a single student individually."""

    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    score = serializers.DecimalField(max_digits=6, decimal_places=2)

    def validate_score(self, score):
        assignment = self.context["assignment"]
        if score < 0:
            raise serializers.ValidationError("Score cannot be negative.")
        if score > assignment.max_score:
            raise serializers.ValidationError(
                "Score cannot exceed the assignment max score "
                f"({assignment.max_score})."
            )
        return score

    def validate_student(self, student):
        assignment = self.context["assignment"]
        if not Enrollment.objects.filter(
            course=assignment.course,
            student=student,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "This student is not an approved member of the course."
            )
        return student
