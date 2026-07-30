from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


@receiver(post_save, sender=User)
def add_user_to_student_group(sender, instance, created, **kwargs):
    if created:
        student_group = Group.objects.get(name="Student")
        instance.groups.add(student_group)