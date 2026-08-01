import random
import string

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


def generate_join_code(length=8):
    return "".join(
        random.choices(
            string.ascii_uppercase + string.digits,
            k=length,
        )
    )

class Course(TimeStampedModel):
    class Visibility(models.TextChoices):
        PRIVATE = "PRIVATE", "Private"
        PUBLIC = "PUBLIC", "Public"

    title = models.CharField(
        max_length=150,
    )

    description = models.TextField(
        blank=True,
    )

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses",
    )

    join_code = models.CharField(
        max_length=8,
        unique=True,
        editable=False,
    )

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.join_code:
            code = generate_join_code()

            while Course.objects.filter(join_code=code).exists():
                code = generate_join_code()

            self.join_code = code

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
    
class Enrollment(TimeStampedModel):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "student"],
                name="unique_student_course",
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.course}"

class CourseSettings(TimeStampedModel):
    course = models.OneToOneField(
        "Course",
        on_delete=models.CASCADE,
        related_name="settings",
    )

    auto_accept_students = models.BooleanField(
        default=False,
        help_text="Approve student enrollment requests automatically.",
    )

    