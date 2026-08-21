from django.contrib import admin

from .models import Course, Enrollment, CourseSettings, Section


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "teacher",
        "join_code",
        "is_active",
        "created_at",
    )

    search_fields = (
        "title",
        "teacher__email",
    )


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "course",
        "created_at",
    )

    list_filter = (
        "course",
    )

    search_fields = (
        "name",
        "course__title",
    )


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        "section",
        "student",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
    )


@admin.register(CourseSettings)
class CourseSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "auto_accept_students",
    )