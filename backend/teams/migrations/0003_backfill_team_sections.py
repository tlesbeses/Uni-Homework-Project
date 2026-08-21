# Backfill migration: every existing Team is assigned to the default Section
# of its course, preserving the Team -> Course relationship through Section.

from django.db import migrations

DEFAULT_SECTION_NAME = "Default"


def backfill_team_sections(apps, schema_editor):
    Section = apps.get_model("course", "Section")
    Team = apps.get_model("teams", "Team")

    for team in Team.objects.filter(section__isnull=True):
        section, _ = Section.objects.get_or_create(
            course_id=team.course_id,
            name=DEFAULT_SECTION_NAME,
        )
        team.section = section
        team.save(update_fields=["section"])


def restore_team_courses(apps, schema_editor):
    Team = apps.get_model("teams", "Team")
    Team.objects.update(section=None)


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0002_team_section"),
        ("course", "0006_backfill_default_sections"),
    ]

    operations = [
        migrations.RunPython(
            backfill_team_sections,
            restore_team_courses,
        ),
    ]
