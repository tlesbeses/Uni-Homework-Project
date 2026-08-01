from django.db.models.signals import post_save
from django.dispatch import receiver

from course.models import Course, CourseSettings


@receiver(post_save, sender=Course)
def create_course_settings(sender, instance, created, **kwargs):
    if created:
        CourseSettings.objects.create(course=instance)
