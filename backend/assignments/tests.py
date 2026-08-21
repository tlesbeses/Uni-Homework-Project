"""Tests for the assignments application."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from assignments.models import Assignment
from course.models import Course, Enrollment, Section, Status

User = get_user_model()


class AssignmentAPITestCase(APITestCase):
    """Shared fixtures for the assignment API tests."""

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        self.student_group, _ = Group.objects.get_or_create(name="Student")

        self.teacher = self.create_user("teacher")
        self.teacher.groups.add(self.teacher_group)

        self.other_teacher = self.create_user("other_teacher")
        self.other_teacher.groups.add(self.teacher_group)

        self.student = self.create_user("student")
        self.student.groups.add(self.student_group)
        self.unapproved_student = self.create_user("unapproved_student")
        self.unapproved_student.groups.add(self.student_group)

        self.course = Course.objects.create(title="Math 101", teacher=self.teacher)
        self.other_course = Course.objects.create(
            title="Physics", teacher=self.other_teacher
        )

        self.enroll_approved(self.student, self.course)

        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            description="Solve the exercises.",
            max_score="10.00",
            is_published=True,
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
    def enroll_approved(cls, student, course) -> Enrollment:
        return Enrollment.objects.create(
            section=cls.get_section(course),
            student=student,
            status=Status.APPROVED,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def assignment_payload(self, **overrides):
        payload = {
            "course": self.course.id,
            "title": "Quiz 1",
            "description": "Short quiz.",
            "max_score": "20.00",
        }
        payload.update(overrides)
        return payload


class AssignmentCreateTests(AssignmentAPITestCase):
    def test_teacher_can_create_assignment_in_own_course(self):
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("assignment-list"),
            self.assignment_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment = Assignment.objects.get(pk=response.data["id"])
        self.assertEqual(assignment.course, self.course)
        self.assertEqual(assignment.title, "Quiz 1")

    def test_teacher_cannot_create_assignment_in_foreign_course(self):
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("assignment-list"),
            self.assignment_payload(course=self.other_course.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Assignment.objects.count(), 1)

    def test_student_cannot_create_assignment(self):
        self.authenticate(self.student)

        response = self.client.post(
            reverse("assignment-list"),
            self.assignment_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Assignment.objects.count(), 1)

    def test_max_score_must_be_greater_than_zero(self):
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("assignment-list"),
            self.assignment_payload(max_score="0.00"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_title_cannot_be_blank(self):
        self.authenticate(self.teacher)

        response = self.client.post(
            reverse("assignment-list"),
            self.assignment_payload(title="   "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_belongs_to_course_via_related_name(self):
        assignment = Assignment.objects.create(
            course=self.course,
            title="Project",
            max_score="100.00",
        )

        self.assertTrue(self.course.assignments.filter(pk=assignment.pk).exists())
        self.assertIn(assignment, list(self.course.assignments.all()))


class AssignmentReadTests(AssignmentAPITestCase):
    def test_approved_student_can_view_assignments_of_approved_course(self):
        self.authenticate(self.student)

        response = self.client.get(reverse("assignment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.assignment.id)

    def test_unapproved_student_cannot_view_assignments(self):
        self.authenticate(self.unapproved_student)

        list_response = self.client.get(reverse("assignment-list"))
        detail_response = self.client.get(
            reverse("assignment-detail", args=[self.assignment.id])
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 0)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_does_not_see_unpublished_assignments(self):
        Assignment.objects.create(
            course=self.course,
            title="Draft",
            max_score="10.00",
            is_published=False,
        )
        self.authenticate(self.student)

        response = self.client.get(reverse("assignment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_teacher_can_view_assignments_of_own_course(self):
        self.authenticate(self.teacher)

        response = self.client.get(reverse("assignment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_course_assignments_nested_endpoint(self):
        self.authenticate(self.student)

        response = self.client.get(
            reverse("course-assignments", kwargs={"course_id": self.course.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course"]["id"], self.course.id)

    def test_course_assignments_nested_endpoint_excludes_foreign_course(self):
        self.authenticate(self.student)

        response = self.client.get(
            reverse("course-assignments", kwargs={"course_id": self.other_course.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


class AssignmentWriteTests(AssignmentAPITestCase):
    def test_teacher_can_edit_own_assignment(self):
        self.authenticate(self.teacher)

        response = self.client.patch(
            reverse("assignment-detail", args=[self.assignment.id]),
            {"title": "Homework 1 Revised"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.title, "Homework 1 Revised")

    def test_other_teacher_cannot_edit_assignment(self):
        self.authenticate(self.other_teacher)

        response = self.client.patch(
            reverse("assignment-detail", args=[self.assignment.id]),
            {"title": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_edit_assignment(self):
        self.authenticate(self.student)

        response = self.client.patch(
            reverse("assignment-detail", args=[self.assignment.id]),
            {"title": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_delete_own_assignment(self):
        self.authenticate(self.teacher)

        response = self.client.delete(
            reverse("assignment-detail", args=[self.assignment.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Assignment.objects.filter(pk=self.assignment.pk).exists())

    def test_student_cannot_delete_assignment(self):
        self.authenticate(self.student)

        response = self.client.delete(
            reverse("assignment-detail", args=[self.assignment.id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
