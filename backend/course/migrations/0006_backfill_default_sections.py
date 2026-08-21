# Backfill migration: every pre-existing Course gets a default Section and
# its existing Enrollments are repointed to it, so no enrollment data is lost
# when Enrollment switches from Course to Section.

from django.db import migrations

DEFAULT_SECTION_NAME = "Default"


def backfill_default_sections(apps, schema_editor):
    Course = apps.get_model("course", "Course")
    Section = apps.get_model("course", "Section")
    Enrollment = apps.get_model("course", "Enrollment")

    for course in Course.objects.all():
        section, _ = Section.objects.get_or_create(
            course=course,
            name=DEFAULT_SECTION_NAME,
        )
        Enrollment.objects.filter(
            course_id=course.id,
            section__isnull=True,
        ).update(section=section)


def restore_course_enrollments(apps, schema_editor):
    Enrollment = apps.get_model("course", "Enrollment")
    Enrollment.objects.update(section=None)


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0005_section_enrollment_section"),
    ]

    operations = [
        migrations.RunPython(
            backfill_default_sections,
            restore_course_enrollments,
        ),
    ]
