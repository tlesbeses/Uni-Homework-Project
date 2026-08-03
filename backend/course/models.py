import secrets
import string

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.db.models import Q

from common.models import TimeStampedModel


def generate_join_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Visibility(models.TextChoices):
    PRIVATE = "PRIVATE", "Private"
    PUBLIC = "PUBLIC", "Public"


class Course(TimeStampedModel):
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
        default=generate_join_code,
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
        constraints = [
            models.CheckConstraint(
                condition=Q(visibility__in=Visibility.values),
                name="course_valid_visibility",
            ),
        ]

    def clean(self):
        super().clean()
        if self.teacher_id and not self.teacher.groups.filter(name="Teacher").exists():
            raise ValidationError(
                {
                    "teacher": (
                        "The course owner must belong to the Teacher group."
                    )
                }
            )
    def __str__(self):
        return self.title


class Status(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class Enrollment(TimeStampedModel):
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
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["course", "student"],
                name="unique_student_course",
            ),
            models.CheckConstraint(
                condition=Q(status__in=Status.values),
                name="enrollment_valid_status",
            ),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.course_id and self.student == self.course.teacher:
            raise ValidationError(
                {"student": "A teacher cannot enroll in their own course."}
            )

    def save(self, *args, **kwargs):
        if self.status == Status.APPROVED and not self.approved_at:
            self.approved_at = timezone.now()
        elif self.status != Status.APPROVED:
            self.approved_at = None
        super().save(*args, **kwargs)

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

    def __str__(self):
        return f"Settings for {self.course}"
