"""Tests for the teams application."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from course.models import Course, Enrollment, Status
from teams.models import Team, TeamMember

User = get_user_model()


class TeamAPITestCase(APITestCase):
    """Shared fixtures for the team API tests."""

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        self.student_group, _ = Group.objects.get_or_create(name="Student")

        self.teacher = self.create_user("teacher")
        self.teacher.groups.add(self.teacher_group)

        self.student = self.create_user("student")
        self.student.groups.add(self.student_group)
        self.student_two = self.create_user("student_two")
        self.student_two.groups.add(self.student_group)
        self.other_student = self.create_user("other_student")
        self.other_student.groups.add(self.student_group)

        self.course = Course.objects.create(
            title="Software Engineering",
            teacher=self.teacher,
        )
        self.other_course = Course.objects.create(
            title="Databases",
            teacher=self.teacher,
        )

        for user in (self.student, self.student_two, self.other_student):
            self.enroll(user, self.course)
        self.enroll(self.student, self.other_course)

    @staticmethod
    def create_user(username: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
        )

    @staticmethod
    def enroll(user, course) -> Enrollment:
        return Enrollment.objects.create(
            course=course,
            student=user,
            status=Status.APPROVED,
        )

    def create_team(self, course=None, name="Team A", leader=None) -> Team:
        return Team.objects.create(
            name=name,
            course=course or self.course,
            leader=leader or self.student,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)


class TeamCRUDTests(TeamAPITestCase):
    def test_teacher_can_create_team_and_leader_becomes_member(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "course_id": self.course.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        team = Team.objects.get(pk=response.data["id"])
        self.assertTrue(team.members.filter(student=self.student).exists())
        self.assertEqual(response.data["leader"]["username"], "student")

    def test_team_name_must_be_unique_per_course(self):
        self.create_team(name="Alpha")
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "course_id": self.course.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_team_name_allowed_in_another_course(self):
        self.create_team(name="Alpha", course=self.course)
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "course_id": self.other_course.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_create_team(self):
        self.authenticate(self.student)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "course_id": self.course.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_create_team_for_someone_elses_course(self):
        other_teacher = self.create_user("other_teacher")
        other_teacher.groups.add(self.teacher_group)
        foreign_course = Course.objects.create(title="Foreign", teacher=other_teacher)

        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "course_id": foreign_course.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_students_can_list_and_view_teams(self):
        team = self.create_team()
        self.authenticate(self.student)

        list_response = self.client.get(reverse("team-list"))
        detail_response = self.client.get(reverse("team-detail", args=[team.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["id"], team.id)
        self.assertIn("members", detail_response.data)

    def test_student_only_sees_teams_of_enrolled_courses(self):
        hidden_course = Course.objects.create(title="Hidden", teacher=self.teacher)
        self.enroll(self.student_two, hidden_course)
        self.create_team(course=self.course, name="Visible")
        self.create_team(course=hidden_course, name="Invisible", leader=self.student_two)

        self.authenticate(self.student)
        response = self.client.get(reverse("team-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Visible")


class TeamMemberTests(TeamAPITestCase):
    def setUp(self):
        super().setUp()
        self.team = self.create_team(name="Alpha", leader=self.student)

    def test_add_member(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.student_two.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.team.members.filter(student=self.student_two).exists())

    def test_add_member_not_enrolled_fails(self):
        outsider = self.create_user("outsider")
        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": outsider.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_duplicate_member_fails(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_in_another_team_of_same_course_cannot_be_added(self):
        self.create_team(name="Beta", leader=self.student_two)

        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.student_two.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_member(self):
        TeamMember.objects.create(team=self.team, student=self.student_two)
        self.authenticate(self.teacher)
        response = self.client.delete(
            reverse("team-remove-member", args=[self.team.id, self.student_two.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self.team.members.filter(student=self.student_two).exists())

    def test_cannot_remove_leader(self):
        self.authenticate(self.teacher)
        response = self.client.delete(
            reverse("team-remove-member", args=[self.team.id, self.student.id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_add_or_remove_members(self):
        self.authenticate(self.student)
        add_response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.student_two.id},
            format="json",
        )
        remove_response = self.client.delete(
            reverse("team-remove-member", args=[self.team.id, self.student_two.id])
        )

        self.assertEqual(add_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(remove_response.status_code, status.HTTP_403_FORBIDDEN)


class TeamLeaderTests(TeamAPITestCase):
    def test_change_leader_promotes_new_leader_to_member(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-change-leader", args=[team.id]),
            {"leader": self.student_two.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        team.refresh_from_db()
        self.assertEqual(team.leader, self.student_two)
        self.assertTrue(team.members.filter(student=self.student_two).exists())

    def test_change_leader_to_non_enrolled_student_fails(self):
        team = self.create_team(name="Alpha", leader=self.student)
        outsider = self.create_user("outsider")
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-change-leader", args=[team.id]),
            {"leader": outsider.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_change_leader_to_current_leader(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-change-leader", args=[team.id]),
            {"leader": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CascadeTests(TeamAPITestCase):
    def test_deleting_course_deletes_its_teams(self):
        team = self.create_team()

        self.course.delete()

        self.assertFalse(Team.objects.filter(pk=team.pk).exists())
        self.assertFalse(TeamMember.objects.filter(team=team).exists())

    def test_deleting_team_deletes_memberships(self):
        team = self.create_team()
        TeamMember.objects.create(team=team, student=self.student_two)
        team_id = team.pk

        team.delete()

        self.assertFalse(TeamMember.objects.filter(team_id=team_id).exists())
