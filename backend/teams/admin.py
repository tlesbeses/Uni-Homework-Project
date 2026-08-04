"""Admin configuration for the teams application."""

from django.contrib import admin

from teams.models import Team, TeamMember


class TeamMemberInline(admin.TabularInline):
    model = TeamMember
    extra = 0
    readonly_fields = ["joined_at"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "course", "leader", "created_at", "updated_at")
    list_filter = ("course",)
    search_fields = ("name", "course__title", "leader__username")
    inlines = [TeamMemberInline]


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("team", "student", "course", "joined_at")
    list_filter = ("course",)
    search_fields = ("team__name", "student__username")
    readonly_fields = ("course",)
