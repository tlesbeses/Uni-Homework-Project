from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from assignments.models import Assignment
from course.models import (
    Course,
    CourseSettings,
    Enrollment,
    Section,
    Status,
)
from grading.models import Grade

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class CourseSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSettings
        fields = ["id", "auto_accept_students"]
        read_only_fields = ["id"]


class CourseSerializer(serializers.ModelSerializer):
    teacher = UserBriefSerializer(read_only=True)
    settings = CourseSettingsSerializer(read_only=True)
    enrollments_count = serializers.IntegerField(read_only=True)
    section_name = serializers.CharField(
        write_only=True,
        max_length=100,
        help_text=(
            "Name of the initial section created along with the course "
            "so it always has at least one."
        ),
    )

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "teacher",
            "join_code",
            "visibility",
            "is_active",
            "enrollments_count",
            "settings",
            "section_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "join_code", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            # The initial section only applies on creation.
            fields["section_name"].read_only = True
        return fields

    def validate_section_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "The section name is required."
            )
        return value

    def create(self, validated_data):
        section_name = validated_data.pop("section_name")
        with transaction.atomic():
            course = super().create(validated_data)
            Section.objects.create(course=course, name=section_name)
        return course


class SectionBriefSerializer(serializers.ModelSerializer):
    """Compact section representation used inside other payloads."""

    course = CourseSerializer(read_only=True)

    class Meta:
        model = Section
        fields = ["id", "name", "course"]
        read_only_fields = fields


class SectionSerializer(serializers.ModelSerializer):
    """CRUD serializer for the sections of a course.

    The course is only set on creation through ``course_id``; moving a
    section to another course is not supported.
    """

    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True,
    )
    enrollments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Section
        fields = [
            "id",
            "name",
            "course",
            "course_id",
            "enrollments_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields["course_id"].read_only = True
        return fields

    def validate(self, attrs):
        """Enforce name uniqueness within the same course."""
        attrs = super().validate(attrs)

        course = attrs.get("course") or getattr(self.instance, "course", None)
        name = attrs.get("name") or getattr(self.instance, "name", None)

        if course is not None and name:
            duplicates = Section.objects.filter(course=course, name=name)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"name": "A section with this name already exists in this course."}
                )

        return attrs


class EnrollmentSerializer(serializers.ModelSerializer):
    section = SectionBriefSerializer(read_only=True)
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source="section",
        write_only=True,
    )
    student = UserBriefSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "section",
            "section_id",
            "student",
            "status",
            "approved_at",
            "created_at",
        ]
        read_only_fields = ["id", "status", "approved_at", "created_at"]

    def validate_section(self, section):
        request = self.context.get("request")
        if request is not None and section.course.teacher_id == request.user.id:
            raise serializers.ValidationError(
                "A teacher cannot enroll in their own course."
            )
        return section

    def validate(self, attrs):
        attrs = super().validate(attrs)

        if self.instance is not None and attrs.get("section") is not None:
            raise serializers.ValidationError(
                {
                    "section": (
                        "The section cannot be changed after the "
                        "enrollment is created."
                    )
                }
            )

        section = attrs.get("section") or getattr(self.instance, "section", None)
        request = self.context.get("request")

        if section is not None and request is not None and self.instance is None:
            duplicates = Enrollment.objects.filter(
                section__course_id=section.course_id,
                student=request.user,
            ).exclude(status=Status.REJECTED)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {
                        "section": (
                            "You already have an enrollment request for "
                            "this course."
                        )
                    }
                )

        return attrs


# ── Dashboard serializers (lightweight, read-only) ──────────────────


class DashboardCourseSerializer(serializers.ModelSerializer):
    enrollments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ["id", "title", "visibility", "enrollments_count", "created_at"]


class DashboardEnrollmentSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(source="section.course.id", read_only=True)
    course_title = serializers.CharField(source="section.course.title", read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "status", "course_id", "course_title"]


class DashboardGradeSerializer(serializers.ModelSerializer):
    assignment_id = serializers.IntegerField(source="assignment.id", read_only=True)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    assignment_max_score = serializers.DecimalField(
        source="assignment.max_score", max_digits=6, decimal_places=2, read_only=True
    )
    course_id = serializers.IntegerField(source="assignment.course.id", read_only=True)
    course_title = serializers.CharField(source="assignment.course.title", read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id", "assignment_id", "score", "assignment_title", "assignment_max_score",
            "course_id", "course_title", "created_at",
        ]


class DashboardAssignmentSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(source="course.id", read_only=True)

    class Meta:
        model = Assignment
        fields = ["id", "title", "max_score", "course_id", "is_published", "created_at"]
