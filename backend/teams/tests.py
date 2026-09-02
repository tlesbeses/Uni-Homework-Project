"""Tests for the teams application."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from assignments.models import Assignment
from course.models import Course, Enrollment, Section, Status
from grading.models import Grade
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
        self.section = self.get_section(self.course)
        self.other_section = self.get_section(self.other_course)

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
    def get_section(course) -> Section:
        """Return the default section of a course, creating it if needed."""
        section, _ = Section.objects.get_or_create(course=course, name="Default")
        return section

    @classmethod
    def enroll(cls, user, course) -> Enrollment:
        return Enrollment.objects.create(
            section=cls.get_section(course),
            student=user,
            status=Status.APPROVED,
        )

    def create_team(self, course=None, name="Team A", leader=None) -> Team:
        return Team.objects.create(
            name=name,
            section=self.get_section(course or self.course),
            leader=leader or self.student,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)


class TeamCRUDTests(TeamAPITestCase):
    def test_teacher_can_create_team_and_leader_becomes_member(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": self.section.id, "leader_id": self.student.id},
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
            {"name": "Alpha", "section_id": self.section.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_team_name_allowed_in_another_course(self):
        self.create_team(name="Alpha", course=self.course)
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": self.other_section.id, "leader_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_can_create_team_and_becomes_leader(self):
        self.authenticate(self.student)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": self.section.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        team = Team.objects.get(pk=response.data["id"])
        self.assertEqual(team.leader, self.student)
        self.assertTrue(team.members.filter(student=self.student).exists())

    def test_student_cannot_create_team_in_course_not_approved(self):
        hidden_course = Course.objects.create(title="Hidden", teacher=self.teacher)
        hidden_section = self.get_section(hidden_course)
        self.authenticate(self.student)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": hidden_section.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_in_another_team_cannot_create_team(self):
        self.create_team(name="Beta", leader=self.student_two)
        self.authenticate(self.student_two)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": self.section.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_cannot_create_team_for_someone_elses_course(self):
        other_teacher = self.create_user("other_teacher")
        other_teacher.groups.add(self.teacher_group)
        foreign_course = Course.objects.create(title="Foreign", teacher=other_teacher)
        foreign_section = self.get_section(foreign_course)

        self.authenticate(self.teacher)
        response = self.client.post(
            reverse("team-list"),
            {"name": "Alpha", "section_id": foreign_section.id, "leader_id": self.student.id},
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

    def test_leader_can_add_and_remove_members(self):
        self.authenticate(self.student)
        add_response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.student_two.id},
            format="json",
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)

        remove_response = self.client.delete(
            reverse("team-remove-member", args=[self.team.id, self.student_two.id])
        )
        self.assertEqual(remove_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_leader_student_cannot_add_or_remove_members(self):
        self.authenticate(self.student_two)
        add_response = self.client.post(
            reverse("team-members", args=[self.team.id]),
            {"student": self.other_student.id},
            format="json",
        )
        remove_response = self.client.delete(
            reverse("team-remove-member", args=[self.team.id, self.other_student.id])
        )

        # The student is not a team member, so the team is not even
        # visible through the scoped queryset (404 instead of 403).
        self.assertEqual(add_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(remove_response.status_code, status.HTTP_404_NOT_FOUND)


class TeamAvailableStudentsTests(TeamAPITestCase):
    def setUp(self):
        super().setUp()
        self.team = self.create_team(name="Alpha", leader=self.student)

    def test_teacher_can_list_available_students(self):
        self.authenticate(self.teacher)

        response = self.client.get(
            reverse("team-available-students", args=[self.team.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {item["student"]["username"] for item in response.data}
        self.assertEqual(
            usernames,
            {"student", "student_two", "other_student"},
        )

    def test_team_leader_can_list_available_students(self):
        self.authenticate(self.student)

        response = self.client.get(
            reverse("team-available-students", args=[self.team.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {item["student"]["username"] for item in response.data}
        self.assertEqual(
            usernames,
            {"student", "student_two", "other_student"},
        )

    def test_non_leader_student_cannot_list_available_students(self):
        TeamMember.objects.create(team=self.team, student=self.student_two)
        self.authenticate(self.student_two)

        response = self.client.get(
            reverse("team-available-students", args=[self.team.id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_approved_students_of_the_team_course_are_returned(self):
        Enrollment.objects.create(
            section=self.section,
            student=self.create_user("pending_student"),
            status=Status.PENDING,
        )
        self.enroll(self.create_user("another_course_student"), self.other_course)
        self.authenticate(self.teacher)

        response = self.client.get(
            reverse("team-available-students", args=[self.team.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {item["student"]["username"] for item in response.data}
        self.assertNotIn("pending_student", usernames)
        self.assertNotIn("another_course_student", usernames)


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

    def test_leader_can_change_leader(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.student)

        response = self.client.post(
            reverse("team-change-leader", args=[team.id]),
            {"leader": self.student_two.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        team.refresh_from_db()
        self.assertEqual(team.leader, self.student_two)

    def test_non_leader_student_cannot_change_leader(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.student_two)

        response = self.client.post(
            reverse("team-change-leader", args=[team.id]),
            {"leader": self.other_student.id},
            format="json",
        )

        # The student is not a team member, so the team is not even
        # visible through the scoped queryset (404 instead of 403).
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TeamLeaderManagementTests(TeamAPITestCase):
    def test_leader_can_edit_and_delete_their_team(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.student)

        patch_response = self.client.patch(
            reverse("team-detail", args=[team.id]),
            {"name": "Alpha Renamed"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(reverse("team-detail", args=[team.id]))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_leader_student_cannot_edit_or_delete_team(self):
        team = self.create_team(name="Alpha", leader=self.student)
        self.authenticate(self.student_two)

        patch_response = self.client.patch(
            reverse("team-detail", args=[team.id]),
            {"name": "Hacked"},
            format="json",
        )
        # The student is not a team member, so the team is not even
        # visible through the scoped queryset (404 instead of 403).
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)

        delete_response = self.client.delete(reverse("team-detail", args=[team.id]))
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)


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


class TeamCleanupOnEnrollmentRemovalTests(TeamAPITestCase):
    """Deleting/rejecting an enrollment must detach the student from teams."""

    def setUp(self):
        super().setUp()
        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )

    def enrollment_of(self, user) -> Enrollment:
        return Enrollment.objects.get(
            student=user, section=self.section
        )

    def test_deleting_enrollment_removes_team_membership_and_keeps_grades(self):
        team = self.create_team(name="Alpha", leader=self.student)
        TeamMember.objects.create(team=team, student=self.student_two)
        grade = Grade.objects.create(
            assignment=self.assignment,
            student=self.student_two,
            score="90.00",
            graded_by=self.teacher,
        )

        self.authenticate(self.teacher)
        response = self.client.delete(
            f"/api/enrollments/{self.enrollment_of(self.student_two).id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            team.members.filter(student=self.student_two).exists()
        )
        self.assertTrue(Team.objects.filter(pk=team.pk).exists())
        # Grades are historical records: they survive the removal.
        self.assertTrue(Grade.objects.filter(pk=grade.pk).exists())

    def test_leadership_transfers_to_earliest_remaining_member(self):
        # Creation order defines joined_at: leader first, then the members.
        team = self.create_team(name="Alpha", leader=self.student)
        TeamMember.objects.create(team=team, student=self.student_two)
        TeamMember.objects.create(team=team, student=self.other_student)

        self.authenticate(self.teacher)
        response = self.client.delete(
            f"/api/enrollments/{self.enrollment_of(self.student).id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        team.refresh_from_db()
        self.assertEqual(team.leader, self.student_two)
        self.assertFalse(
            team.members.filter(student=self.student).exists()
        )
        self.assertTrue(Team.objects.filter(pk=team.pk).exists())

    def test_team_is_deleted_when_leader_was_the_last_member(self):
        team = self.create_team(name="Alpha", leader=self.student)

        self.authenticate(self.teacher)
        response = self.client.delete(
            f"/api/enrollments/{self.enrollment_of(self.student).id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Team.objects.filter(pk=team.pk).exists())

    def test_rejecting_an_approved_enrollment_cleans_teams(self):
        team = self.create_team(name="Alpha", leader=self.student)
        TeamMember.objects.create(team=team, student=self.student_two)

        self.authenticate(self.teacher)
        response = self.client.post(
            f"/api/enrollments/{self.enrollment_of(self.student_two).id}/reject/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            team.members.filter(student=self.student_two).exists()
        )
        self.assertTrue(Team.objects.filter(pk=team.pk).exists())

    def test_deleting_a_pending_enrollment_does_not_touch_teams(self):
        outsider = self.create_user("outsider")
        outsider.groups.add(self.student_group)
        pending = Enrollment.objects.create(
            section=self.section,
            student=outsider,
            status=Status.PENDING,
        )
        team = self.create_team(name="Alpha", leader=self.student)
        membership = TeamMember.objects.create(team=team, student=outsider)

        self.authenticate(self.teacher)
        response = self.client.delete(f"/api/enrollments/{pending.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(
            TeamMember.objects.filter(pk=membership.pk).exists()
        )
        self.assertTrue(Team.objects.filter(pk=team.pk).exists())

    def test_student_can_leave_course_and_teams_are_cleaned(self):
        team = self.create_team(name="Alpha", leader=self.student)
        TeamMember.objects.create(team=team, student=self.student_two)

        self.authenticate(self.student_two)
        response = self.client.delete(
            f"/api/enrollments/{self.enrollment_of(self.student_two).id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            team.members.filter(student=self.student_two).exists()
        )

class SuperuserIsolationTests(TeamAPITestCase):
    """The superuser has no special powers in the regular team views."""

    def setUp(self):
        super().setUp()
        self.superuser = self.create_user("root")
        self.superuser.is_superuser = True
        self.superuser.save()

    def test_superuser_sees_no_teams(self):
        self.create_team(course=self.course, name="Team A", leader=self.student)
        self.authenticate(self.superuser)

        response = self.client.get("/api/teams/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_superuser_cannot_create_team_without_approved_enrollment(self):
        self.authenticate(self.superuser)

        response = self.client.post(
            "/api/teams/",
            {"name": "Hacked", "section_id": self.section.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
