"""Admin configuration for the grading application."""

from django.contrib import admin

from grading.models import Grade


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = (
        "assignment",
        "student",
        "score",
        "is_individual",
        "graded_by",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "is_individual",
        "assignment",
    )
    search_fields = (
        "student__username",
        "student__email",
        "student__first_name",
        "student__last_name",
        "assignment__title",
    )
