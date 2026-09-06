from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from course.models import Course, CourseSettings, Section
from course.snapshots import capture_section_snapshot


@receiver(post_save, sender=Course)
def create_course_settings(sender, instance, created, **kwargs):
    if created:
        CourseSettings.objects.create(course=instance)


@receiver(pre_delete, sender=Section)
def snapshot_section(sender, instance, **kwargs):
    capture_section_snapshot(instance, origin=kwargs.get("origin"))