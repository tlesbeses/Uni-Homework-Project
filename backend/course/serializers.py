from django.contrib.auth import get_user_model
from rest_framework import serializers

from course.models import Course, CourseSettings, Enrollment

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "join_code", "created_at", "updated_at"]


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True,
    )
    student = UserBriefSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "course",
            "course_id",
            "student",
            "status",
            "approved_at",
            "created_at",
        ]
        read_only_fields = ["id", "status", "approved_at", "created_at"]
