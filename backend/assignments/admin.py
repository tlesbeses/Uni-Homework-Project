"""Admin configuration for the assignments application."""

from django.contrib import admin

from assignments.models import Assignment


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "is_published", "due_date", "created_at")
    list_filter = ("is_published", "course")
    search_fields = ("title", "course__title")
