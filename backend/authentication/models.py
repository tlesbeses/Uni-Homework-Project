from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(
        unique=True,
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.email:
            self.email = None
        super().save(*args, **kwargs)


class EventLog(models.Model):
    """Registro de actividad reutilizable (auditoría/analítica).

    Almacena eventos de forma aditiva sin alterar la lógica de negocio.
    Hoy se usa para impersonaciones; mañana puede registrar logins,
    creación/borrado de entidades, cambios de estado, etc.
    """

    ACTION_IMPERSONATE = "impersonate"
    ACTION_LOGIN = "login"
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"

    actor = models.ForeignKey(
        "authentication.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="logged_events",
    )
    target = models.ForeignKey(
        "authentication.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="targeted_events",
    )
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50, blank=True, default="")
    entity_id = models.PositiveBigIntegerField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["actor"]),
            models.Index(fields=["target"]),
        ]

    def __str__(self):
        return f"{self.actor_id} {self.action} {self.entity_type}:{self.entity_id}"
