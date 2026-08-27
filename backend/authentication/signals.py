from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

User = get_user_model()

GROUP_CACHE_KEY_PREFIX = "group:"


@receiver(post_save, sender=User)
def add_user_to_student_group(sender, instance, created, **kwargs):
    if created:
         student_group, _ = Group.objects.get_or_create(name="Student")
         instance.groups.add(student_group)


@receiver(m2m_changed, sender=User.groups.through)
def invalidate_group_cache(sender, instance, action, **kwargs):
    """Invalidar la caché de pertenencia a grupos al cambiar la membresía.

    Sin esta invalidación, un usuario promovido/demovido a "Teacher" seguía
    con los permisos viejos hasta 5 minutos (course.permissions._has_group).
    """
    if action not in ("post_add", "post_remove", "post_clear"):
        return
    user_id = getattr(instance, "pk", None)
    if not user_id:
        return
    cache.delete(f"{GROUP_CACHE_KEY_PREFIX}{user_id}:Teacher")
    cache.delete(f"{GROUP_CACHE_KEY_PREFIX}{user_id}:Student")