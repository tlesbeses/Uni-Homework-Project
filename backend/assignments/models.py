"""Assignment models.

An Assignment belongs directly to a Course (never to a Team) and holds the
course's activities/tasks. Deliveries and grading live outside this module.
"""

from decimal import Decimal

from django.db import models
from django.db.models import Q

from common.models import TimeStampedModel
from course.models import Course


class AssignmentCategory(models.TextChoices):
    ACUMULADO = "ACUMULADO", "Acumulado"
    EXAMEN = "EXAMEN", "Examen"


class AssignmentParcial(models.TextChoices):
    PRIMERO = "PRIMERO", "Parcial 1"
    SEGUNDO = "SEGUNDO", "Parcial 2"


class Assignment(TimeStampedModel):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="assignments",
        help_text="The course this assignment belongs to.",
    )

    title = models.CharField(
        max_length=150,
        help_text="Display name of the assignment.",
    )

    description = models.TextField(
        blank=True,
        help_text="Optional details about the assignment.",
    )

    max_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Maximum score of the assignment.",
    )

    due_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional deadline for the assignment.",
    )

    is_published = models.BooleanField(
        default=True,
        help_text="Drafts are hidden from students until published.",
    )

    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text=(
            "Relative importance of the assignment in the final weighted "
            "grade. A weight of 1 makes it count the same as the raw points."
        ),
    )

    category = models.CharField(
        max_length=10,
        choices=AssignmentCategory.choices,
        default=AssignmentCategory.ACUMULADO,
        help_text=(
            "Whether the assignment counts as accumulated work or as an exam. "
            "Exams are not weighted: their percentage is taken as-is."
        ),
    )

    parcial = models.CharField(
        max_length=10,
        choices=AssignmentParcial.choices,
        default=AssignmentParcial.PRIMERO,
        help_text="Which partial (term) the assignment belongs to.",
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["course", "is_published"]),
            models.Index(fields=["course", "due_date"]),
            models.Index(fields=["course", "category", "parcial"]),
        ]

        constraints = [
            models.CheckConstraint(
                condition=Q(max_score__gt=0),
                name="assignments_assignment_max_score_gt_0",
            ),
            models.CheckConstraint(
                condition=Q(weight__gt=0),
                name="assignments_assignment_weight_gt_0",
            ),
            models.CheckConstraint(
                condition=Q(category__in=AssignmentCategory.values),
                name="assignments_assignment_valid_category",
            ),
            models.CheckConstraint(
                condition=Q(parcial__in=AssignmentParcial.values),
                name="assignments_assignment_valid_parcial",
            ),
        ]

    def __str__(self) -> str:
        return self.title
