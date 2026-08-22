"""Business logic for team lifecycle maintenance.

Keeping this out of the models/signals makes the cleanup explicit at every
entry point and easy to test in isolation.
"""

from django.db import transaction

from teams.models import Team, TeamMember


@transaction.atomic
def remove_student_from_course_teams(*, student, course) -> int:
    """Remove a student from every team of a course.

    Team leadership is resolved before memberships are deleted: if the
    student leads a team that still has other members, the earliest joined
    remaining member becomes the leader; otherwise the team is deleted.
    Returns the number of distinct teams the student was removed from.
    """
    affected_team_ids = set(
        TeamMember.objects.filter(
            student=student,
            team__section__course=course,
        ).values_list("team_id", flat=True)
    )
    affected_team_ids.update(
        Team.objects.filter(
            leader=student,
            section__course=course,
        ).values_list("id", flat=True)
    )

    for team in Team.objects.filter(id__in=affected_team_ids, leader=student):
        successor_id = (
            TeamMember.objects.filter(team=team)
            .exclude(student=student)
            .order_by("joined_at", "pk")
            .values_list("student_id", flat=True)
            .first()
        )
        if successor_id is not None:
            team.leader_id = successor_id
            team.save()
        else:
            team.delete()

    TeamMember.objects.filter(
        student=student,
        team__section__course=course,
    ).delete()

    return len(affected_team_ids)
