"""Grade model.

A Grade represents the score a student earned on a single Assignment.

    Grade = Assignment + Student + Score

It never stores a Team directly. When the teacher grades a team, the service
layer creates one Grade per member with ``is_individual=False``; a later
individual adjustment sets ``is_individual=True`` on that student's Grade so
future team re-grades leave it untouched.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from common.models import TimeStampedModel


class Grade(TimeStampedModel):
    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        related_name="grades",
        help_text="The assignment being graded.",
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grades",
        help_text="The student receiving the grade.",
    )

    score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Score earned by the student, between 0 and the assignment max score.",
    )

    is_individual = models.BooleanField(
        default=False,
        help_text=(
            "False when the score comes from the team grade; True when the "
            "teacher set a specific score for this student."
        ),
    )

    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="given_grades",
        help_text="The teacher that registered the grade.",
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["assignment", "student"]),
            models.Index(fields=["student", "assignment"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"],
                name="unique_assignment_student_grade",
            ),
            models.CheckConstraint(
                condition=Q(score__gte=0),
                name="grades_grade_score_gte_0",
            ),
        ]

    def clean(self):
        super().clean()
        if self.score is not None:
            if self.score < 0:
                raise ValidationError({"score": "Score cannot be negative."})
            if self.assignment_id and self.score > self.assignment.max_score:
                raise ValidationError(
                    {
                        "score": (
                            "Score cannot exceed the assignment max score "
                            f"({self.assignment.max_score})."
                        )
                    }
                )

    def __str__(self):
        return f"{self.student} - {self.assignment}: {self.score}"
