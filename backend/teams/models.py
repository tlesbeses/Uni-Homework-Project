from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.models import TimeStampedModel
from course.models import Enrollment, Section, Status


class Team(TimeStampedModel):
    name = models.CharField(
        max_length=100,
        help_text="Display name of the team, unique per section.",
    )

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="teams",
        help_text=(
            "The section the team belongs to. The course is reached "
            "through Team -> Section -> Course."
        ),
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
                fields=["section", "name"],
                name="teams_team_unique_name_per_section",
                violation_error_message=(
                    "A team with this name already exists in this section."
                ),
            ),
        ]

        indexes = [
            models.Index(fields=["section", "name"]),
            models.Index(fields=["section", "leader"]),
            models.Index(fields=["leader"]),
        ]

    def clean(self) -> None:
        super().clean()

        if self.leader_id and self.section_id:
            if not self.is_enrolled_in_section(self.leader, self.section):
                raise ValidationError(
                    {
                        "leader": (
                            "The team leader must be an approved member of "
                            "the section."
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

    @staticmethod
    def is_enrolled_in_section(student, section) -> bool:
        return Enrollment.objects.filter(
            section=section,
            student=student,
            status=Status.APPROVED,
        ).exists()

    def save(self, *args, **kwargs) -> None:
        super().save(*args, **kwargs)
        if self.leader_id:
            self.members.get_or_create(student_id=self.leader_id)

    def __str__(self) -> str:
        return f"{self.name} ({self.section_id})"


class TeamMember(models.Model):
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
        "course.Course",
        on_delete=models.CASCADE,
        related_name="+",
        editable=False,
        help_text=(
            "Denormalized copy of the team's section course used to enforce "
            "the 'one team per student per course' rule at the database level."
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

    def clean(self) -> None:
        super().clean()

        if self.team_id and not self.course_id:
            self.course_id = self.team.section.course_id

        if self.team_id and self.course_id and self.course_id != self.team.section.course_id:
            raise ValidationError(
                {"course": "A member's course must match the team's course."}
            )

        if self.team_id and self.student_id:
            if not self.is_enrolled_in_section(self.student, self.team.section):
                raise ValidationError(
                    {
                        "student": (
                            "A student must be an approved member of the section "
                            "to join a team."
                        )
                    }
                )

    def save(self, *args, **kwargs) -> None:
        if self.team_id and not self.course_id:
            self.course_id = self.team.section.course_id
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.student_id} in team {self.team_id}"
