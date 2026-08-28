# Backfill migration: garantiza que todo Course tenga su CourseSettings de
# una sola fila (el acceso `course.settings` en serializers/querysets fallaba
# con RelatedObjectDoesNotExist en cursos creados por bulk_create/fixtures).

from django.db import migrations


def backfill_course_settings(apps, schema_editor):
    Course = apps.get_model("course", "Course")
    CourseSettings = apps.get_model("course", "CourseSettings")

    for course in Course.objects.all():
        CourseSettings.objects.get_or_create(course=course)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0007_remove_enrollment_course_alter_enrollment_section"),
    ]

    operations = [
        migrations.RunPython(
            backfill_course_settings,
            noop,
        ),
    ]
