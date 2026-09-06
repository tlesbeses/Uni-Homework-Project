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
        db_index=True,
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
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher", "is_active"]),
            models.Index(fields=["visibility", "is_active"]),
            models.Index(fields=["title"]),
        ]

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


class Section(TimeStampedModel):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="sections",
        help_text="The course this section belongs to.",
    )

    name = models.CharField(
        max_length=100,
        help_text=(
            "Display name of the section, unique within the same course "
            "(e.g. '1TS1'). The same name may exist in other courses."
        ),
    )

    class Meta:
        ordering = ["name"]

        constraints = [
            models.UniqueConstraint(
                fields=["course", "name"],
                name="course_section_unique_name_per_course",
                violation_error_message=(
                    "A section with this name already exists in this course."
                ),
            ),
        ]

        indexes = [
            models.Index(fields=["course", "name"]),
        ]

    def clean(self):
        super().clean()

        if self.course_id and self.name:
            duplicates = Section.objects.filter(
                course_id=self.course_id,
                name=self.name,
            )
            if self.pk:
                duplicates = duplicates.exclude(pk=self.pk)
            if duplicates.exists():
                raise ValidationError(
                    {
                        "name": (
                            "A section with this name already exists "
                            "in this course."
                        )
                    }
                )

    def __str__(self):
        return f"{self.course} - {self.name}"


class Status(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class Enrollment(TimeStampedModel):
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="enrollments",
        help_text=(
            "The section of the course the student requested to join. "
            "The course is reached through Enrollment -> Section -> Course."
        ),
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
        db_index=True,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["section", "status"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["section", "student"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["section", "student"],
                name="unique_student_section",
                violation_error_message=(
                    "This student already has an enrollment request "
                    "for this section."
                ),
            ),
            models.CheckConstraint(
                condition=Q(status__in=Status.values),
                name="enrollment_valid_status",
            ),
        ]

    @property
    def course(self):
        """Convenience accessor: the course is reached through the section."""
        return self.section.course

    def clean(self):
        super().clean()

        if self.student_id and self.section_id:
            if self.student == self.section.course.teacher:
                raise ValidationError(
                    {
                        "student": (
                            "A teacher cannot enroll in their own course."
                        )
                    }
                )

            duplicates = Enrollment.objects.filter(
                section__course_id=self.section.course_id,
                student_id=self.student_id,
            )
            if self.pk:
                duplicates = duplicates.exclude(pk=self.pk)
            if duplicates.exists():
                raise ValidationError(
                    {
                        "section": (
                            "This student already has an enrollment request "
                            "for another section of this course."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        if self.status == Status.APPROVED and not self.approved_at:
            self.approved_at = timezone.now()
        elif self.status != Status.APPROVED:
            self.approved_at = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} - {self.course}"


class SectionSnapshot(TimeStampedModel):
    """Immutable copy of a section taken right before it is deleted.

    The payload is a fully denormalized JSON document (course, section,
    teacher, students, teams, assignments, grades, final grades and stats)
    so the data survives the deletion of the original rows. It is written
    only by the ``capture_section_snapshot`` service before the cascade
    delete of a section (reason ``section_delete``) or of its course
    (reason ``course_delete``), hence the integer ids and text headers that
    would otherwise be dangling foreign keys.
    """

    REASON_SECTION_DELETE = "section_delete"
    REASON_COURSE_DELETE = "course_delete"

    course_id = models.IntegerField(db_index=True)
    course_title = models.CharField(max_length=150)
    teacher_id = models.IntegerField(db_index=True)
    teacher_name = models.CharField(max_length=300)
    section_id = models.IntegerField(db_index=True)
    section_name = models.CharField(max_length=100)
    reason = models.CharField(
        max_length=32,
        default=REASON_SECTION_DELETE,
        db_index=True,
    )
    payload = models.JSONField(
        help_text="Denormalized snapshot of the section data.",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher_id", "created_at"]),
            models.Index(fields=["course_id"]),
        ]

    def __str__(self):
        return f"{self.course_title} - {self.section_name} ({self.id})"


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
