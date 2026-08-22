"""Tests for the grading application.

Covers the 16 core business rules of the grading module.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from assignments.models import Assignment
from course.models import Course, Enrollment, Section, Status
from grading.models import Grade
from teams.models import Team, TeamMember

User = get_user_model()


class GradingAPITestCase(APITestCase):
    """Shared fixtures for the grading API tests."""

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")

        self.teacher = self.create_user("teacher")
        self.teacher.groups.add(self.teacher_group)

        self.other_teacher = self.create_user("other_teacher")
        self.other_teacher.groups.add(self.teacher_group)

        self.student = self.create_user("student")
        self.student2 = self.create_user("student2")
        self.unapproved_student = self.create_user("unapproved_student")

        self.course = Course.objects.create(title="Math 101", teacher=self.teacher)
        self.other_course = Course.objects.create(
            title="Physics", teacher=self.other_teacher
        )

        self.enroll(self.student, self.course)
        self.enroll(self.student2, self.course)

        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        self.foreign_assignment = Assignment.objects.create(
            course=self.other_course,
            title="Homework Physics",
            max_score="100.00",
            is_published=True,
        )

        self.team = self.create_team("Team A", [self.student, self.student2])
        self.foreign_team = self.create_team(
            "Team Foreign", [self.student2], course=self.other_course
        )

    @staticmethod
    def create_user(username: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="pass",
        )

    @staticmethod
    def get_section(course) -> Section:
        """Return the default section of a course, creating it if needed."""
        section, _ = Section.objects.get_or_create(course=course, name="Default")
        return section

    @classmethod
    def enroll(cls, student, course) -> Enrollment:
        return Enrollment.objects.create(
            section=cls.get_section(course),
            student=student,
            status=Status.APPROVED,
        )

    def create_team(self, name, members, course=None, leader=None):
        course = course or self.course
        leader = leader or members[0]
        team = Team.objects.create(
            name=name,
            section=self.get_section(course),
            leader=leader,
        )
        for member in members:
            if member != leader:
                TeamMember.objects.create(team=team, student=member)
        return team

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def grade_team(self, assignment, team, score, user=None):
        if user is not None:
            self.authenticate(user)
        return self.client.post(
            reverse(
                "assignment-grade-team",
                kwargs={"assignment_id": assignment.id},
            ),
            {"team": team.id, "score": score},
            format="json",
        )

    def grade_student(self, assignment, student, score, user=None):
        if user is not None:
            self.authenticate(user)
        return self.client.post(
            reverse(
                "assignment-grade-student",
                kwargs={"assignment_id": assignment.id},
            ),
            {"student": student.id, "score": score},
            format="json",
        )


class GradeTeamTests(GradingAPITestCase):
    def test_teacher_can_grade_a_team_of_their_course(self):
        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Grade.objects.count(), 2)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            Grade.objects.filter(
                student=self.student,
                score=Decimal("95.00"),
            ).exists()
        )
        self.assertTrue(
            Grade.objects.filter(
                student=self.student2,
                score=Decimal("95.00"),
            ).exists()
        )

    def test_teacher_cannot_grade_a_team_of_another_course(self):
        response = self.grade_team(self.assignment, self.foreign_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_teacher_cannot_grade_a_course_of_another_teacher(self):
        response = self.grade_team(
            self.foreign_assignment, self.team, "95.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Grade.objects.count(), 0)

    def test_grading_a_team_creates_grades_for_all_members(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        member_ids = set(self.team.members.values_list("student_id", flat=True))
        graded_ids = set(Grade.objects.values_list("student_id", flat=True))
        self.assertEqual(graded_ids, member_ids)

    def test_team_grade_marks_all_grades_as_not_individual(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertFalse(
            Grade.objects.filter(
                assignment=self.assignment,
                is_individual=True,
            ).exists()
        )
        self.assertEqual(
            Grade.objects.filter(
                assignment=self.assignment,
                is_individual=False,
            ).count(),
            2,
        )

    def test_grade_team_skips_members_without_approved_enrollment(self):
        """A removed student keeps out of team re-grading (ghost member)."""
        Enrollment.objects.filter(
            student=self.student2, section__course=self.course
        ).delete()

        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(
            Grade.objects.filter(
                assignment=self.assignment,
                student=self.student,
                score=Decimal("95.00"),
            ).exists()
        )
        self.assertFalse(
            Grade.objects.filter(
                assignment=self.assignment, student=self.student2
            ).exists()
        )

    def test_team_without_active_members_cannot_be_graded(self):
        Enrollment.objects.filter(section__course=self.course).delete()

        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)


class GradeStudentTests(GradingAPITestCase):
    def test_teacher_can_grade_a_student_individually(self):
        response = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.assertEqual(grade.score, Decimal("80.00"))
        self.assertTrue(grade.is_individual)
        self.assertEqual(grade.graded_by, self.teacher)

    def test_individual_grade_is_marked_as_individual(self):
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)

        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.assertTrue(grade.is_individual)

    def test_individual_grade_is_not_overwritten_by_team_regrade(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        individual = Grade.objects.get(
            assignment=self.assignment, student=self.student
        )
        group_member = Grade.objects.get(
            assignment=self.assignment, student=self.student2
        )
        self.assertEqual(individual.score, Decimal("80.00"))
        self.assertTrue(individual.is_individual)
        self.assertEqual(group_member.score, Decimal("100.00"))
        self.assertFalse(group_member.is_individual)

    def test_team_grades_update_when_team_is_regraded(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        for student in (self.student, self.student2):
            grade = Grade.objects.get(assignment=self.assignment, student=student)
            self.assertEqual(grade.score, Decimal("100.00"))
            self.assertFalse(grade.is_individual)


class GradeAccessTests(GradingAPITestCase):
    def test_student_cannot_create_grades(self):
        self.authenticate(self.student)

        team_response = self.grade_team(self.assignment, self.team, "95.00")
        student_response = self.grade_student(
            self.assignment, self.student, "80.00"
        )
        list_response = self.client.post(
            reverse("grade-list"), {}, format="json"
        )

        self.assertEqual(team_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(student_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(list_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(Grade.objects.count(), 0)

    def test_student_can_only_list_their_own_grades(self):
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)
        self.grade_student(self.assignment, self.student2, "70.00", self.teacher)

        self.authenticate(self.student)
        response = self.client.get(reverse("grade-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["student"]["id"], self.student.id)

    def test_student_cannot_retrieve_another_students_grade(self):
        self.grade_student(self.assignment, self.student2, "70.00", self.teacher)
        grade = Grade.objects.get(
            assignment=self.assignment, student=self.student2
        )

        self.authenticate(self.student)
        response = self.client.get(reverse("grade-detail", args=[grade.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_can_list_grades_of_own_courses_only(self):
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)
        self.grade_student(
            self.foreign_assignment, self.student, "60.00", self.other_teacher
        )

        self.authenticate(self.teacher)
        response = self.client.get(reverse("grade-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["assignment"]["course"]["id"],
            self.course.id,
        )

    def test_student_loses_access_to_grades_after_enrollment_removal(self):
        """Grades are preserved but hidden from the removed student."""
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)

        Enrollment.objects.filter(
            student=self.student, section__course=self.course
        ).delete()

        self.authenticate(self.student)
        student_response = self.client.get(reverse("grade-list"))
        detail = Grade.objects.get(assignment=self.assignment, student=self.student)
        detail_response = self.client.get(
            reverse("grade-detail", args=[detail.id])
        )

        self.assertEqual(student_response.status_code, status.HTTP_200_OK)
        self.assertEqual(student_response.data["count"], 0)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

        # The teacher keeps the historical record of their course.
        self.authenticate(self.teacher)
        teacher_response = self.client.get(reverse("grade-list"))

        self.assertEqual(teacher_response.status_code, status.HTTP_200_OK)
        self.assertEqual(teacher_response.data["count"], 1)


class GradeValidationTests(GradingAPITestCase):
    def test_cannot_grade_student_not_belonging_to_course(self):
        response = self.grade_student(
            self.assignment, self.unapproved_student, "50.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_grade_a_team_belonging_to_another_course(self):
        response = self.grade_team(self.assignment, self.foreign_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_exceed_assignment_max_score(self):
        team_response = self.grade_team(self.assignment, self.team, "101.00", self.teacher)
        student_response = self.grade_student(
            self.assignment, self.student, "101.00", self.teacher
        )

        self.assertEqual(team_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(student_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_use_a_negative_score(self):
        response = self.grade_team(self.assignment, self.team, "-5.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_grade_a_team_without_members(self):
        empty_team = self.create_team("Empty Team", [self.unapproved_student])
        TeamMember.objects.filter(team=empty_team).delete()

        response = self.grade_team(self.assignment, empty_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_only_one_grade_per_assignment_and_student(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        self.assertEqual(
            Grade.objects.filter(
                assignment=self.assignment, student=self.student
            ).count(),
            1,
        )
        grade = Grade.objects.get(
            assignment=self.assignment, student=self.student
        )
        self.assertEqual(grade.score, Decimal("100.00"))

        with self.assertRaises(IntegrityError):
            Grade.objects.create(
                assignment=self.assignment,
                student=self.student,
                score="90.00",
                graded_by=self.teacher,
            )
