"""Serializers for the grading application.

The write serializers only accept ``team``/``student`` and ``score``. The
``graded_by`` teacher is never read from the client; the service layer sets
it from ``request.user``.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from assignments.models import Assignment
from course.models import Course, Enrollment, Status
from grading.models import Grade, GradeHistory
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
    """Read-only representation of a Grade.

    ``is_individual`` (whether the grade came from an individual override or
    from a team-wide score) is only exposed to teachers; students see their
    scores without that detail.
    """

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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("show_grade_origin"):
            data.pop("is_individual", None)
        return data


class GradeHistorySerializer(serializers.ModelSerializer):
    """Read-only representation of a single grade change."""

    graded_by = UserBriefSerializer(read_only=True)

    class Meta:
        model = GradeHistory
        fields = [
            "id",
            "first_record",
            "old_score",
            "new_score",
            "graded_by",
            "created_at",
        ]
        read_only_fields = fields


class GradeTeamSerializer(serializers.Serializer):
    """Validate the payload used to grade a whole team."""

    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
    score = serializers.DecimalField(max_digits=6, decimal_places=2)
    # When False (default), students with individual grades keep their own
    # score; when True, the team score replaces every member's grade.
    overwrite_individual = serializers.BooleanField(
        required=False, default=False
    )

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
        if team.section.course_id != assignment.course_id:
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
        # Section is resolved through Grade -> Student -> Enrollment -> Section.
        if not Enrollment.objects.filter(
            section__course=assignment.course,
            student=student,
            status=Status.APPROVED,
        ).exists():
            raise serializers.ValidationError(
                "This student is not an approved member of the course."
            )
        return student
