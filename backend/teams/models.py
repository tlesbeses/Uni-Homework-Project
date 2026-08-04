"""Model definitions for the teams application.

The teams app is responsible only for managing student teams inside a course.
It knows nothing about assignments, grades, submissions, or scoring; those
concerns belong to other applications.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.models import TimeStampedModel
from course.models import Course, Enrollment, Status


class Team(TimeStampedModel):
    """A group of students that work together inside a single course."""

    name = models.CharField(
        max_length=100,
        help_text="Display name of the team, unique per course.",
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="teams",
        help_text="The course the team belongs to.",
    )

    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="led_teams",
        help_text="The student that leads the team.",
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["course", "name"],
                name="teams_team_unique_name_per_course",
                violation_error_message=(
                    "A team with this name already exists in this course."
                ),
            ),
        ]

        indexes = [
            models.Index(fields=["course", "name"]),
            models.Index(fields=["course", "leader"]),
            models.Index(fields=["leader"]),
        ]

    def clean(self) -> None:
        """Validate the team-level business rules."""
        super().clean()

        if self.leader_id and self.course_id:
            if not TeamMember.is_enrolled_in_course(self.leader, self.course):
                raise ValidationError(
                    {
                        "leader": (
                            "The team leader must be an approved member of "
                            "the course."
                        )
                    }
                )

        if self.pk and self.leader_id:
            if not self.members.filter(student_id=self.leader_id).exists():
                raise ValidationError(
                    {
                        "leader": "The team leader must be a member of the team.",
                    }
                )

    def save(self, *args, **kwargs) -> None:
        """Persist the team, keeping the leader-membership invariant in sync.

        The leader is always added as a member of the team so the
        "leader must belong to the team" rule holds in every code path.
        """
        super().save(*args, **kwargs)
        if self.leader_id:
            self.members.get_or_create(student_id=self.leader_id)

    def __str__(self) -> str:
        return f"{self.name} ({self.course_id})"


class TeamMember(models.Model):
    """The membership of a student in a team."""

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="members",
        help_text="The team the student belongs to.",
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
        help_text="The student that is a member of the team.",
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="+",
        editable=False,
        help_text=(
            "Denormalized copy of the team course used to enforce the "
            "'one team per student per course' rule at the database level."
        ),
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["team", "student"],
                name="teams_teammember_unique_team_student",
                violation_error_message=(
                    "This student is already a member of the team."
                ),
            ),
            models.UniqueConstraint(
                fields=["student", "course"],
                name="teams_teammember_unique_student_course",
                violation_error_message=(
                    "This student already belongs to another team in this course."
                ),
            ),
        ]

        indexes = [
            models.Index(fields=["team", "joined_at"]),
            models.Index(fields=["student", "team"]),
            models.Index(fields=["course"]),
        ]

    @staticmethod
    def is_enrolled_in_course(student, course) -> bool:
        """Return True when the student has an approved enrollment in the course."""
        return Enrollment.objects.filter(
            course=course,
            student=student,
            status=Status.APPROVED,
        ).exists()

    def clean(self) -> None:
        """Validate the membership-level business rules."""
        super().clean()

        if self.team_id and not self.course_id:
            self.course_id = self.team.course_id

        if self.team_id and self.course_id and self.course_id != self.team.course_id:
            raise ValidationError(
                {"course": "A member's course must match the team's course."}
            )

        if self.team_id and self.student_id:
            course = self.team.course
            if not self.is_enrolled_in_course(self.student, course):
                raise ValidationError(
                    {
                        "student": (
                            "A student must be an approved member of the course "
                            "to join a team."
                        )
                    }
                )

    def save(self, *args, **kwargs) -> None:
        """Persist the membership, keeping the denormalized course in sync."""
        if self.team_id and not self.course_id:
            self.course_id = self.team.course_id
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.student_id} in team {self.team_id}"
