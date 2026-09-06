import secrets

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


class ErrorLog(models.Model):
    """Registro de excepciones para observabilidad in-house (sin Sentry).

    Se escribe desde dos frentes: el ``EXCEPTION_HANDLER`` de DRF (errores
    500 de la API, que de otro modo no quedarían registrados) y el endpoint
    ``POST /api/errors/`` (excepciones del frontend: errores no controlados
    y ``ErrorBoundary``). Guardo siempre una clave pública ``error_id`` y
    nunca traceback en el campo compartido. El listado es solo para
    superusuarios.
    """

    SOURCE_SERVER = "server"
    SOURCE_CLIENT = "client"

    error_id = models.CharField(
        max_length=16,
        unique=True,
        editable=False,
        help_text="Identificador corto público del error para soporte.",
    )
    source = models.CharField(
        max_length=16,
        default=SOURCE_SERVER,
        choices=[(SOURCE_SERVER, "Server"), (SOURCE_CLIENT, "Client")],
        db_index=True,
    )
    kind = models.CharField(max_length=200, blank=True, default="")
    message = models.TextField(blank=True, default="")
    path = models.CharField(max_length=500, blank=True, default="")
    method = models.CharField(max_length=10, blank=True, default="")
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    status_code = models.IntegerField(null=True, blank=True)
    error_id_ref = models.CharField(
        max_length=16,
        blank=True,
        default="",
        help_text="error_id del error en el otro lado del request (server o client).",
    )
    traceback = models.TextField(blank=True, default="")
    client_metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source", "-created_at"]),
            models.Index(fields=["kind"]),
        ]

    def save(self, *args, **kwargs):
        if not self.error_id:
            self.error_id = secrets.token_urlsafe(8)[:16]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.error_id} {self.kind}: {self.message[:60]}"
