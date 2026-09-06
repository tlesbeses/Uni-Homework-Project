from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    ENROLLMENT_APPROVED = "enrollment_approved", "Enrollment approved"
    ENROLLMENT_REQUESTED = "enrollment_requested", "Enrollment requested"
    GRADE_PUBLISHED = "grade_published", "Grade published"


class Notification(models.Model):
    """In-app notification for a single user (system events only).

    The payload is a denormalized JSON bag with the ids/titles needed by the
    frontend to render a message and navigate to the source (course, section,
    assignment, grade...). Types and rendering live on the client
    (`notificationMeta`); the backend only stores opaque, structured data.
    """

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(
        max_length=32,
        choices=NotificationType.choices,
        db_index=True,
    )
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.recipient_id} {self.type} (read={self.is_read})"