"""Serializers for the assignments application."""

from django.utils import timezone
from rest_framework import serializers

from assignments.models import Assignment
from course.models import Course


class CourseBriefSerializer(serializers.ModelSerializer):
    """Compact course representation used inside assignment payloads."""

    class Meta:
        model = Course
        fields = ["id", "title"]


class CourseField(serializers.PrimaryKeyRelatedField):
    """Accept a course id on write and serialize it nested on read."""

    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        return CourseBriefSerializer(value).data


class AssignmentSerializer(serializers.ModelSerializer):
    course = CourseField(queryset=Course.objects.all())

    class Meta:
        model = Assignment
        fields = [
            "id",
            "course",
            "title",
            "description",
            "max_score",
            "due_date",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        """Freeze ``course`` once an assignment already exists.

        Assignments are managed per course through the dedicated endpoint,
        so the course cannot be moved between courses via a generic PATCH.
        """
        fields = super().get_fields()
        if self.instance is not None:
            fields["course"].read_only = True
        return fields

    def validate_title(self, value) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_max_score(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "max_score must be greater than 0."
            )
        return value

    def validate_due_date(self, value):
        """Reject past deadlines only when the assignment is first created.

        On updates the value may legitimately already have passed (e.g. when
        editing an overdue assignment), so only the create path is checked.
        """
        if value is None or self.instance is not None:
            return value
        if timezone.is_naive(value):
            value = timezone.make_aware(
                value, timezone.get_current_timezone()
            )
        if value < timezone.now():
            raise serializers.ValidationError(
                "The due date cannot be in the past."
            )
        return value
