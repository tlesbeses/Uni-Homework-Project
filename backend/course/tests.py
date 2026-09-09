import threading
import unittest
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connections
from django.test import TransactionTestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from assignments.models import Assignment
from authentication.models import EventLog
from course.models import (
    Course,
    CourseSettings,
    Enrollment,
    Section,
    SectionSnapshot,
    Status,
    Visibility,
)
from course.services import (
    EnrollmentInvalidStateError,
    approve_enrollment,
    create_enrollment,
    delete_enrollment,
    reject_enrollment,
)
from grading.models import Grade
from notifications.models import Notification, NotificationType
from teams.models import Team

User = get_user_model()


class BaseCourseTestCase(APITestCase):
    def setUp(self):
        self.teacher_group = Group.objects.get_or_create(name="Teacher")[0]
        self.student_group = Group.objects.get_or_create(name="Student")[0]

        self.teacher = User.objects.create_user(
            username="teacher",
            email="teacher@example.com",
            password="pass",
        )
        self.teacher.groups.add(self.teacher_group)

        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="pass",
        )
        self.student.groups.add(self.student_group)

        self.student2 = User.objects.create_user(
            username="student2",
            email="student2@example.com",
            password="pass",
        )
        self.student2.groups.add(self.student_group)

        self.course = Course.objects.create(
            title="Math 101",
            teacher=self.teacher,
            visibility=Visibility.PUBLIC,
        )

        self.section = Section.objects.create(
            course=self.course,
            name="1TS1",
        )
        self.section2 = Section.objects.create(
            course=self.course,
            name="2TS2",
        )


class CourseTests(BaseCourseTestCase):
    def test_teacher_can_create_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/courses/",
            {"title": "Physics", "visibility": "PUBLIC", "section_name": "1TS1"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["join_code"])
        self.assertEqual(response.data["teacher"]["id"], self.teacher.id)
        self.assertTrue(CourseSettings.objects.filter(course_id=response.data["id"]).exists())

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/courses/", {"title": "Physics"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_course_title_cannot_be_whitespace_only(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/courses/",
            {"title": "   ", "visibility": "PUBLIC", "section_name": "1TS1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_sees_only_own_courses(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_student_sees_public_courses(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_join_code_has_expected_length(self):
        self.assertEqual(len(self.course.join_code), 8)


class SectionTests(BaseCourseTestCase):
    def test_teacher_can_create_section_in_own_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/sections/",
            {"name": "3TS3", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Section.objects.filter(course=self.course, name="3TS3").exists()
        )

    def test_student_cannot_create_section(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/sections/",
            {"name": "Hacked", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_section_name_cannot_be_whitespace_only(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/sections/",
            {"name": "   ", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_teacher_cannot_create_section_in_foreign_course(self):
        other_teacher = User.objects.create_user(
            username="other_teacher",
            email="other_teacher@example.com",
            password="pass",
        )
        other_teacher.groups.add(self.teacher_group)
        self.client.force_authenticate(other_teacher)
        response = self.client.post(
            "/api/sections/",
            {"name": "Hacked", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_section_name_must_be_unique_within_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/sections/",
            {"name": "1TS1", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_section_name_allowed_in_different_courses(self):
        other_course = Course.objects.create(
            title="Physics 101",
            teacher=self.teacher,
        )
        Section.objects.create(course=other_course, name="1TS1")

        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/sections/",
            {"name": "1TS1", "course_id": other_course.id},
            format="json",
        )
        # Only one section named 1TS1 exists per course.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            "/api/sections/",
            {"name": "9ZZ9", "course_id": other_course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_teacher_can_update_and_delete_own_section(self):
        self.client.force_authenticate(self.teacher)

        patch_response = self.client.patch(
            f"/api/sections/{self.section.id}/",
            {"name": "1TS1-renamed"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.section.refresh_from_db()
        self.assertEqual(self.section.name, "1TS1-renamed")

        delete_response = self.client.delete(f"/api/sections/{self.section2.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Section.objects.filter(pk=self.section2.pk).exists()
        )

    def test_student_cannot_update_or_delete_section(self):
        self.client.force_authenticate(self.student)
        patch_response = self.client.patch(
            f"/api/sections/{self.section.id}/",
            {"name": "Hacked"},
            format="json",
        )
        delete_response = self.client.delete(f"/api/sections/{self.section.id}/")
        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_list_sections_of_own_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get(f"/api/sections/?course={self.course.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_student_can_consult_sections_of_public_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/sections/?course={self.course.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data["results"]}
        self.assertEqual(names, {"1TS1", "2TS2"})

    def test_course_nested_sections_endpoint(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/courses/{self.course.id}/sections/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        names = {item["name"] for item in response.data["results"]}
        self.assertEqual(names, {"1TS1", "2TS2"})


class EnrollmentTests(BaseCourseTestCase):
    def test_student_joins_by_code(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Status.PENDING)
        self.assertEqual(response.data["section"]["name"], "1TS1")

    def test_join_requires_section(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["section"],
            ["This field is required."],
        )
        self.assertGreater(len(response.data["available_sections"]), 0)

    def test_join_with_invalid_section_rejected(self):
        foreign_course = Course.objects.create(
            title="Foreign 101",
            teacher=self.teacher,
        )
        foreign_section = Section.objects.create(
            course=foreign_course,
            name="X1",
        )
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": foreign_section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Invalid section for this course.",
        )
        self.assertGreater(len(response.data["available_sections"]), 0)

    def test_duplicate_join_rejected(self):
        Enrollment.objects.create(section=self.section, student=self.student)
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section2.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "You already requested to join this course.",
        )

    def test_invalid_join_code(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/courses/join/", {"join_code": "NOPE1234"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Invalid join code.")

    def test_teacher_cannot_join_any_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            Enrollment.objects.filter(
                section__course=self.course,
                student=self.teacher,
            ).exists()
        )

    def test_teacher_cannot_join_foreign_course_by_code(self):
        other_teacher = User.objects.create_user(
            username="foreign_teacher",
            email="foreign_teacher@example.com",
            password="pass",
        )
        other_teacher.groups.add(self.teacher_group)
        self.client.force_authenticate(other_teacher)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            Enrollment.objects.filter(
                section__course=self.course,
                student=other_teacher,
            ).exists()
        )

    def test_teacher_can_approve_enrollment(self):
        enrollment = Enrollment.objects.create(
            section=self.section,
            student=self.student,
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Status.APPROVED)
        self.assertIsNotNone(response.data["approved_at"])

    def test_student_cannot_approve_enrollment(self):
        enrollment = Enrollment.objects.create(
            section=self.section,
            student=self.student,
        )
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_sees_only_own_enrollments(self):
        Enrollment.objects.create(section=self.section, student=self.student)
        Enrollment.objects.create(section=self.section, student=self.student2)
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/enrollments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_auto_accept_approves_on_join(self):
        self.course.settings.auto_accept_students = True
        self.course.settings.save()
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Status.APPROVED)

    def test_join_creates_event_log(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        enrollment = Enrollment.objects.get(section=self.section, student=self.student)
        log = EventLog.objects.filter(
            action=EventLog.ACTION_CREATE, entity_type="enrollment"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.student)
        self.assertEqual(log.target, self.student)
        self.assertEqual(log.entity_id, enrollment.id)
        self.assertEqual(log.metadata["course_id"], self.course.id)
        self.assertEqual(log.metadata["section_id"], self.section.id)
        self.assertEqual(log.metadata["student_id"], self.student.id)
        self.assertEqual(log.metadata["status"], Status.PENDING)

    def test_join_auto_accept_logs_final_status(self):
        self.course.settings.auto_accept_students = True
        self.course.settings.save()
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = EventLog.objects.filter(
            action=EventLog.ACTION_CREATE, entity_type="enrollment"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.metadata["status"], Status.APPROVED)

    def test_direct_enroll_creates_event_log(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = EventLog.objects.filter(
            action=EventLog.ACTION_CREATE, entity_type="enrollment"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.metadata["course_id"], self.course.id)
        self.assertEqual(log.metadata["status"], Status.PENDING)

    def test_student_can_enroll_directly_in_public_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Status.PENDING)

    def test_duplicate_enroll_rejected(self):
        Enrollment.objects.create(section=self.section, student=self.student)
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section2.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "You already requested to join this course.",
        )

    def test_cannot_enroll_in_private_course(self):
        private_course = Course.objects.create(
            title="Private 101",
            teacher=self.teacher,
            visibility=Visibility.PRIVATE,
        )
        private_section = Section.objects.create(
            course=private_course,
            name="P1",
        )
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{private_course.id}/enroll/",
            {"section": private_section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_enroll_in_own_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_enroll_in_foreign_public_course(self):
        other_teacher = User.objects.create_user(
            username="foreign_teacher",
            email="foreign_teacher@example.com",
            password="pass",
        )
        other_teacher.groups.add(self.teacher_group)
        self.client.force_authenticate(other_teacher)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            Enrollment.objects.filter(
                section__course=self.course,
                student=other_teacher,
            ).exists()
        )

    def test_approve_already_approved_returns_400_with_detail(self):
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        approve_enrollment(enrollment=enrollment, actor=self.teacher)
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            f"/api/enrollments/{enrollment.id}/approve/"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Enrollment is already approved.",
        )

    def test_enroll_respects_auto_accept(self):
        self.course.settings.auto_accept_students = True
        self.course.settings.save()
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Status.APPROVED)


class EnrollmentSectionChangeTests(BaseCourseTestCase):
    def setUp(self):
        super().setUp()
        self.enrollment = Enrollment.objects.create(
            section=self.section,
            student=self.student,
        )
        self.private_course = Course.objects.create(
            title="Private 202",
            teacher=self.teacher,
            visibility=Visibility.PRIVATE,
        )
        self.private_section = Section.objects.create(
            course=self.private_course,
            name="P1",
        )

    def _assert_section_unchanged(self):
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.section_id, self.section.id)

    def test_student_cannot_move_enrollment_to_private_course_section(self):
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f"/api/enrollments/{self.enrollment.id}/",
            {"section_id": self.private_section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_section_unchanged()

    def test_student_cannot_change_enrollment_section_same_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f"/api/enrollments/{self.enrollment.id}/",
            {"section_id": self.section2.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_section_unchanged()

    def test_put_cannot_change_enrollment_section(self):
        self.client.force_authenticate(self.student)
        response = self.client.put(
            f"/api/enrollments/{self.enrollment.id}/",
            {"section_id": self.private_section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_section_unchanged()

    def test_teacher_cannot_move_enrollment_to_foreign_course_section(self):
        foreign_teacher = User.objects.create_user(
            username="teacher2",
            email="teacher2@example.com",
            password="pass",
        )
        foreign_teacher.groups.add(self.teacher_group)
        foreign_course = Course.objects.create(
            title="Foreign 202",
            teacher=foreign_teacher,
            visibility=Visibility.PUBLIC,
        )
        foreign_section = Section.objects.create(
            course=foreign_course,
            name="F1",
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/enrollments/{self.enrollment.id}/",
            {"section_id": foreign_section.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_section_unchanged()


class CourseSettingsTests(BaseCourseTestCase):
    def test_teacher_can_update_settings(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"auto_accept_students": True},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["auto_accept_students"])

    def test_student_cannot_update_settings(self):
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"auto_accept_students": True},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_boolean_auto_accept_rejected(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"auto_accept_students": "banana"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_settings_include_ponderacion_defaults(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get(
            f"/api/courses/{self.course.id}/course_settings/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ponderacion_enabled"])
        self.assertEqual(response.data["p1_acumulado_pct"], "25.00")
        self.assertEqual(response.data["p2_examen_pct"], "25.00")

    def test_teacher_can_enable_ponderacion(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {
                "ponderacion_enabled": True,
                "p1_acumulado_pct": "15.00",
                "p1_examen_pct": "35.00",
                "p2_acumulado_pct": "35.00",
                "p2_examen_pct": "15.00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ponderacion_enabled"])
        self.assertEqual(response.data["p1_examen_pct"], "35.00")

    def test_ponderacion_percentages_must_sum_to_100(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {
                "p1_acumulado_pct": "30.00",
                "p1_examen_pct": "20.00",
                "p2_acumulado_pct": "20.00",
                "p2_examen_pct": "20.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_percentage_rejected(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"p1_acumulado_pct": "-5.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_percentage_above_100_rejected(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"p1_acumulado_pct": "105.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SuperuserIsolationTests(BaseCourseTestCase):
    """The root user (is_superuser) has no special powers in the regular views.

    Admin capabilities are limited to the admin console
    (``/auth/admin/*`` and the admin dashboard); outside of it the
    superuser behaves like a plain (non teacher/student) user.
    """

    def setUp(self):
        super().setUp()
        self.superuser = User.objects.create_superuser(
            username="root",
            email="root@example.com",
            password="pass",
        )

    def test_superuser_only_sees_public_active_courses(self):
        private_course = Course.objects.create(
            title="Private Math",
            teacher=self.teacher,
            visibility=Visibility.PRIVATE,
        )
        self.client.force_authenticate(self.superuser)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        course_ids = {course["id"] for course in response.data["results"]}
        self.assertIn(self.course.id, course_ids)
        self.assertNotIn(private_course.id, course_ids)

    def test_superuser_sees_no_enrollments(self):
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.PENDING,
        )
        self.client.force_authenticate(self.superuser)
        response = self.client.get("/api/enrollments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_superuser_cannot_change_settings_of_foreign_course(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/course_settings/",
            {"auto_accept_students": True},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_cannot_create_section_in_foreign_course(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.post(
            "/api/sections/",
            {"name": "Hacked", "course_id": self.course.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_dashboard_includes_recent_impersonations(self):
        EventLog.objects.create(
            actor=self.superuser,
            target=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        self.client.force_authenticate(self.superuser)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["type"], "admin")
        impersonations = response.data["recent_impersonations"]
        self.assertEqual(len(impersonations), 1)
        self.assertEqual(impersonations[0]["target"]["id"], self.student.id)
        self.assertEqual(impersonations[0]["admin"]["id"], self.superuser.id)
        self.assertIn("timestamp", impersonations[0])

    def test_admin_dashboard_includes_recent_activity(self):
        EventLog.objects.create(
            actor=self.superuser,
            target=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        EventLog.objects.create(
            actor=self.superuser,
            action=EventLog.ACTION_UPDATE,
            entity_type="grade",
        )
        self.client.force_authenticate(self.superuser)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        activity = response.data["recent_activity"]
        self.assertEqual(len(activity), 2)
        actions = {log["action"] for log in activity}
        self.assertEqual(actions, {"impersonate", "update"})
        self.assertIn("created_at", activity[0])


class ArchiveCourseTests(BaseCourseTestCase):
    """Archived courses (``is_active=False``) are hidden from students but
    stay visible to the teacher so they can be restored."""

    def setUp(self):
        super().setUp()
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.APPROVED,
        )
        self.course.is_active = False
        self.course.save()

    def test_teacher_sees_own_archived_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {c["id"] for c in response.data["results"]}
        self.assertIn(self.course.id, ids)

    def test_student_detail_of_archived_course_returns_404(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(f"/api/courses/{self.course.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_hides_archived_course_from_everywhere(self):
        self.client.force_authenticate(self.student)

        courses = self.client.get("/api/courses/")
        self.assertEqual(courses.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.course.id, {c["id"] for c in courses.data["results"]}
        )

        sections = self.client.get("/api/sections/")
        self.assertEqual(sections.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.section.id, {s["id"] for s in sections.data["results"]}
        )

        enrollments = self.client.get("/api/enrollments/")
        self.assertEqual(enrollments.status_code, status.HTTP_200_OK)
        self.assertEqual(enrollments.data["results"], [])

        grades = self.client.get("/api/grades/")
        self.assertEqual(grades.status_code, status.HTTP_200_OK)
        self.assertEqual(grades.data["results"], [])

        assignments = self.client.get("/api/assignments/")
        self.assertEqual(assignments.status_code, status.HTTP_200_OK)
        self.assertEqual(assignments.data["results"], [])

    def test_dashboard_student_excludes_archived_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["enrollments"], [])
        self.assertEqual(response.data["grades"], [])
        self.assertEqual(response.data["assignments"], [])

    def test_teacher_can_restore_archived_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.course.id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        detail = self.client.get(f"/api/courses/{self.course.id}/")
        self.assertTrue(detail.data["is_active"])

    def test_student_cannot_join_archived_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code, "section": self.section.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_enroll_in_archived_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/courses/{self.course.id}/enroll/",
            {"section": self.section.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CourseForeignOwnershipTests(BaseCourseTestCase):
    """A teacher cannot manage a course they do not own."""

    def setUp(self):
        super().setUp()
        self.other_teacher = User.objects.create_user(
            username="other_teacher",
            email="other_teacher@example.com",
            password="pass",
        )
        self.other_teacher.groups.add(self.teacher_group)
        self.foreign_course = Course.objects.create(
            title="Foreign 101",
            teacher=self.other_teacher,
        )

    def test_other_teacher_cannot_update_foreign_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/courses/{self.foreign_course.id}/",
            {"title": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_teacher_cannot_delete_foreign_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.delete(f"/api/courses/{self.foreign_course.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            Course.objects.filter(pk=self.foreign_course.id).exists()
        )


@unittest.skipUnless(
    connections["default"].vendor == "postgresql",
    "Threading concurrency tests require row-level locking "
    "(SELECT ... FOR UPDATE). On SQLite concurrent writers raise "
    "'database is locked' instead of serializing into an IntegrityError.",
)
class ConcurrentEnrollmentTests(TransactionTestCase):
    """Two simultaneous join/enroll requests must never create a duplicate
    enrollment nor an HTTP 500.

    PostgreSQL serializes both requests through the course row lock; the
    unique constraint plus the ``IntegrityError`` backstop in
    ``create_enrollment`` keep the invariant elsewhere. Outcomes are exactly
    one enrollment and one success/one duplicate error.
    """

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        self.student_group, _ = Group.objects.get_or_create(name="Student")

        self.teacher = User.objects.create_user(
            username="race_teacher",
            password="pass",
        )
        self.teacher.groups.add(self.teacher_group)

        self.student = User.objects.create_user(
            username="race_student",
            password="pass",
        )
        self.student.groups.add(self.student_group)

        self.course = Course.objects.create(
            title="Race 101",
            teacher=self.teacher,
            visibility=Visibility.PUBLIC,
        )
        self.section = Section.objects.create(course=self.course, name="S1")

    def _join(self, results, barrier):
        client = APIClient()
        client.force_authenticate(user=self.student)
        try:
            barrier.wait()
            response = client.post(
                "/api/courses/join/",
                {
                    "join_code": self.course.join_code,
                    "section": self.section.id,
                },
                format="json",
            )
            results.append(response.status_code)
        finally:
            connections.close_all()

    def _enroll(self, results, barrier):
        client = APIClient()
        client.force_authenticate(user=self.student)
        try:
            barrier.wait()
            response = client.post(
                f"/api/courses/{self.course.id}/enroll/",
                {"section": self.section.id},
                format="json",
            )
            results.append(response.status_code)
        finally:
            connections.close_all()

    def _run_concurrently(self, target):
        results = []
        barrier = threading.Barrier(2)
        threads = [
            threading.Thread(target=target, args=(results, barrier))
            for _ in range(2)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        return results

    def test_concurrent_joins_create_single_enrollment(self):
        results = self._run_concurrently(self._join)

        self.assertEqual(set(results), {status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST})
        count = Enrollment.objects.filter(
            section=self.section,
            student=self.student,
        ).count()
        self.assertEqual(count, 1)

    def test_concurrent_enrolls_create_single_enrollment(self):
        results = self._run_concurrently(self._enroll)

        self.assertEqual(set(results), {status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST})
        count = Enrollment.objects.filter(
            section=self.section,
            student=self.student,
        ).count()
        self.assertEqual(count, 1)

    def test_concurrent_auto_accept_enrolls_create_single_approved(self):
        CourseSettings.objects.filter(course=self.course).update(
            auto_accept_students=True,
        )
        results = self._run_concurrently(self._enroll)

        self.assertEqual(set(results), {status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST})
        enrollment = Enrollment.objects.get(
            section=self.section,
            student=self.student,
        )
        self.assertEqual(enrollment.status, Status.APPROVED)


class SectionSnapshotTests(BaseCourseTestCase):
    """Snapshots are captured when a section or its course is deleted."""

    def setUp(self):
        super().setUp()
        self.foreign_teacher = User.objects.create_user(
            username="teacher2",
            email="teacher2@example.com",
            password="pass",
        )
        self.foreign_teacher.groups.add(self.teacher_group)

        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.APPROVED,
        )
        Enrollment.objects.create(
            section=self.section,
            student=self.student2,
        )
        Grade.objects.create(
            assignment=self.assignment,
            student=self.student,
            score=Decimal("80.00"),
            graded_by=self.teacher,
        )

    def test_section_delete_captures_frozen_data(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.delete(f"/api/sections/{self.section.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(Section.objects.filter(id=self.section.id).exists())
        snapshot = SectionSnapshot.objects.get(section_id=self.section.id)
        self.assertEqual(snapshot.reason, SectionSnapshot.REASON_SECTION_DELETE)
        self.assertEqual(snapshot.course_title, "Math 101")
        self.assertEqual(snapshot.section_name, "1TS1")
        self.assertEqual(snapshot.teacher_id, self.teacher.id)

        payload = snapshot.payload
        self.assertEqual(payload["course"]["title"], "Math 101")
        self.assertEqual(payload["teacher"]["username"], "teacher")
        self.assertEqual(payload["stats"]["approved_students"], 1)
        self.assertEqual(payload["stats"]["total_requests"], 2)
        self.assertEqual(len(payload["enrollments"]), 2)
        self.assertEqual(payload["enrollments"][0]["status"], Status.APPROVED)
        self.assertEqual(payload["grades"][0]["score"], "80.00")
        self.assertEqual(payload["final_grades"][0]["score"], "80.00")
        self.assertEqual(
            payload["assignments"][0]["title"], "Homework 1"
        )

    def test_course_delete_captures_one_snapshot_per_section(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.delete(f"/api/courses/{self.course.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        snapshots = SectionSnapshot.objects.filter(
            course_id=self.course.id
        ).order_by("section_name")
        self.assertEqual(snapshots.count(), 2)
        self.assertTrue(
            all(s.reason == SectionSnapshot.REASON_COURSE_DELETE for s in snapshots)
        )
        self.assertEqual({s.section_name for s in snapshots}, {"1TS1", "2TS2"})

    def test_empty_section_still_captures_header(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.delete(f"/api/sections/{self.section2.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        snapshot = SectionSnapshot.objects.get(section_id=self.section2.id)
        self.assertEqual(snapshot.payload["stats"]["approved_students"], 0)
        self.assertEqual(snapshot.payload["stats"]["total_requests"], 0)

    def test_teacher_only_sees_own_snapshots(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/sections/{self.section.id}/")

        self.client.force_authenticate(self.foreign_teacher)
        response = self.client.get("/api/snapshots/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

        response = self.client.get(
            f"/api/snapshots/{SectionSnapshot.objects.get().id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_sees_list_and_detail(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/sections/{self.section.id}/")

        response = self.client.get("/api/snapshots/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["course_title"], "Math 101")
        self.assertNotIn("payload", response.data["results"][0])

        snapshot_id = response.data["results"][0]["id"]
        detail = self.client.get(f"/api/snapshots/{snapshot_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertIn("payload", detail.data)
        self.assertIn("stats", detail.data)

    def test_superuser_sees_every_snapshot(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/sections/{self.section.id}/")

        superuser = User.objects.create_superuser(
            username="root",
            email="root@example.com",
            password="pass",
        )
        self.client.force_authenticate(superuser)
        response = self.client.get("/api/snapshots/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_exports_from_snapshot(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/sections/{self.section.id}/")
        snapshot_id = SectionSnapshot.objects.get().id

        xlsx = self.client.get(f"/api/snapshots/{snapshot_id}/export-grades/")
        self.assertEqual(xlsx.status_code, status.HTTP_200_OK)
        self.assertEqual(xlsx.content[:2], b"PK")

        csv_response = self.client.get(
            f"/api/snapshots/{snapshot_id}/export-grades-csv/"
        )
        self.assertEqual(csv_response.status_code, status.HTTP_200_OK)
        body = csv_response.content.decode("utf-8")
        self.assertIn("Estudiante", body)
        self.assertIn("80", body)

        report = self.client.get(f"/api/snapshots/{snapshot_id}/grades-report/")
        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertEqual(report.data["course"], "Math 101")
        self.assertEqual(report.data["section"], "1TS1")
        self.assertEqual(report.data["assignments"][0]["title"], "Homework 1")
        self.assertEqual(report.data["assignments"][0]["category"], "ACUMULADO")
        self.assertEqual(report.data["assignments"][0]["parcial"], "PRIMERO")
        self.assertEqual(report.data["students"][0]["total"], 80.0)

    def test_grades_report_assignments_include_category_and_parcial(self):
        self.client.force_authenticate(self.teacher)
        report = self.client.get(f"/api/sections/{self.section.id}/grades-report/")
        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertEqual(report.data["assignments"][0]["category"], "ACUMULADO")
        self.assertEqual(report.data["assignments"][0]["parcial"], "PRIMERO")

    def test_student_cannot_see_other_snapshots_list(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/sections/{self.section.id}/")

        self.client.force_authenticate(self.student)
        response = self.client.get("/api/snapshots/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)


class DashboardFinalScoreTests(BaseCourseTestCase):
    """The student dashboard exposes the final score per course."""

    def setUp(self):
        super().setUp()
        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.APPROVED,
        )
        Grade.objects.create(
            assignment=self.assignment,
            student=self.student,
            score=Decimal("80.00"),
            graded_by=self.teacher,
        )

    def test_dashboard_includes_final_score_per_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["final_scores"],
            {str(self.course.id): "80.00"},
        )

    def test_dashboard_assignment_payload_excludes_weight(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/dashboard/")
        assignment = next(
            a for a in response.data["assignments"]
            if a["id"] == self.assignment.id
        )
        self.assertNotIn("weight", assignment)

    def test_dashboard_exposes_parcial_scores_when_ponderacion_enabled(self):
        settings, _ = CourseSettings.objects.get_or_create(course=self.course)
        settings.ponderacion_enabled = True
        settings.p1_acumulado_pct = Decimal("35.00")
        settings.p1_examen_pct = Decimal("35.00")
        settings.p2_acumulado_pct = Decimal("15.00")
        settings.p2_examen_pct = Decimal("15.00")
        settings.save()

        self.assignment.category = "ACUMULADO"
        self.assignment.parcial = "PRIMERO"
        self.assignment.save()

        self.client.force_authenticate(self.student)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["parcial_scores"],
            {
                str(self.course.id): {
                    "PRIMERO": "80.00",
                    "SEGUNDO": None,
                }
            },
        )

    def test_dashboard_omits_parcial_scores_without_ponderacion(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.data["parcial_scores"], {})


class EnrollmentServiceTests(BaseCourseTestCase):
    """Unit tests for the enrollment service layer."""

    def test_create_enrollment_pending_notifies_teacher_and_audits(self):
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        self.assertEqual(enrollment.status, Status.PENDING)
        self.assertIsNone(enrollment.approved_at)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.teacher,
                type=NotificationType.ENROLLMENT_REQUESTED,
            ).exists()
        )
        self.assertTrue(
            EventLog.objects.filter(
                entity_type="enrollment",
                action=EventLog.ACTION_CREATE,
                entity_id=enrollment.pk,
            ).exists()
        )

    def test_create_enrollment_auto_accepts_when_course_settings_enabled(self):
        CourseSettings.objects.update_or_create(
            course=self.course,
            defaults={"auto_accept_students": True},
        )
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.status, Status.APPROVED)
        self.assertIsNotNone(enrollment.approved_at)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )

    def test_approve_enrollment_approves_notifies_and_audits(self):
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        approve_enrollment(enrollment=enrollment, actor=self.teacher)
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.status, Status.APPROVED)
        self.assertIsNotNone(enrollment.approved_at)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )
        self.assertTrue(
            EventLog.objects.filter(
                entity_type="enrollment",
                action=EventLog.ACTION_UPDATE,
                entity_id=enrollment.pk,
            ).exists()
        )

    def test_approve_enrollment_already_approved_raises(self):
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        approve_enrollment(enrollment=enrollment, actor=self.teacher)
        with self.assertRaises(EnrollmentInvalidStateError):
            approve_enrollment(enrollment=enrollment, actor=self.teacher)

    def test_reject_enrollment_from_approved_detaches_from_teams(self):
        CourseSettings.objects.update_or_create(
            course=self.course,
            defaults={"auto_accept_students": True},
        )
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )
        self.assertEqual(enrollment.status, Status.APPROVED)

        team = Team.objects.create(
            section=self.section,
            name="Team A",
            leader=self.student,
        )
        self.assertTrue(team.members.filter(student=self.student).exists())

        reject_enrollment(enrollment=enrollment, actor=self.teacher)
        enrollment.refresh_from_db()

        self.assertEqual(enrollment.status, Status.REJECTED)
        self.assertIsNone(enrollment.approved_at)
        self.assertFalse(Team.objects.filter(pk=team.pk).exists())
        self.assertFalse(
            self.student.team_memberships.filter(course=self.course).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )

    def test_reject_enrollment_already_rejected_raises(self):
        enrollment = Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.REJECTED,
        )
        with self.assertRaises(EnrollmentInvalidStateError):
            reject_enrollment(enrollment=enrollment, actor=self.teacher)

    def test_delete_enrollment_detaches_approved_student_from_teams(self):
        CourseSettings.objects.update_or_create(
            course=self.course,
            defaults={"auto_accept_students": True},
        )
        enrollment = create_enrollment(
            section=self.section,
            student=self.student,
            actor=self.student,
        )

        team = Team.objects.create(
            section=self.section,
            name="Team B",
            leader=self.student,
        )

        enrollment_id = enrollment.pk

        delete_enrollment(enrollment=enrollment, actor=self.teacher)

        self.assertFalse(
            Enrollment.objects.filter(pk=enrollment_id).exists()
        )
        self.assertFalse(Team.objects.filter(pk=team.pk).exists())
        self.assertFalse(
            self.student.team_memberships.filter(course=self.course).exists()
        )
        self.assertTrue(
            EventLog.objects.filter(
                entity_type="enrollment",
                action=EventLog.ACTION_DELETE,
                entity_id=enrollment_id,
            ).exists()
        )


class CourseProgressTests(BaseCourseTestCase):
    def setUp(self):
        super().setUp()
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.APPROVED,
        )
        Enrollment.objects.create(
            section=self.section,
            student=self.student2,
            status=Status.APPROVED,
        )
        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        self.draft = Assignment.objects.create(
            course=self.course,
            title="Draft",
            max_score="100.00",
            is_published=False,
        )

    def _grade(self, student, score):
        Grade.objects.create(
            assignment=self.assignment,
            student=student,
            score=score,
            graded_by=self.teacher,
        )

    def test_teacher_sees_aggregates_for_own_course(self):
        self._grade(self.student, Decimal("80.00"))

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(
            f"/api/courses/{self.course.id}/progress/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["course_id"], self.course.id)
        self.assertEqual(data["student_count"], 2)
        self.assertEqual(data["overall_avg_final"], 40.0)

        assignment = next(
            a for a in data["assignments"] if a["title"] == "Homework 1"
        )
        self.assertEqual(assignment["graded"], 1)
        self.assertEqual(assignment["pending"], 1)
        self.assertEqual(assignment["avg"], 80.0)
        self.assertEqual(assignment["max"], 80.0)
        self.assertEqual(assignment["min"], 80.0)
        self.assertEqual(len(data["assignments"]), 1)

        students = {s["name"]: s for s in data["students"]}
        self.assertEqual(students[self.student.username]["final"], 80.0)
        self.assertEqual(students[self.student2.username]["final"], 0.0)

    def test_unpublished_assignments_are_excluded(self):
        self._grade(self.student, Decimal("60.00"))
        added = Assignment.objects.create(
            course=self.course,
            title="Only draft",
            max_score="100.00",
            is_published=False,
        )
        Grade.objects.create(
            assignment=added,
            student=self.student,
            score=Decimal("90.00"),
            graded_by=self.teacher,
        )

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(
            f"/api/courses/{self.course.id}/progress/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [a["title"] for a in response.data["assignments"]],
            ["Homework 1"],
        )

    def test_empty_course_returns_zeroed_payload(self):
        empty = Course.objects.create(title="Empty", teacher=self.teacher)

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f"/api/courses/{empty.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["student_count"], 0)
        self.assertEqual(response.data["assignments"], [])
        self.assertEqual(response.data["students"], [])
        self.assertIsNone(response.data["overall_avg_final"])

    def test_student_cannot_access_progress(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.get(
            f"/api/courses/{self.course.id}/progress/"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_foreign_teacher_cannot_access_other_course_progress(self):
        other_teacher = User.objects.create_user(
            username="other_teacher",
            email="other@example.com",
            password="pass",
        )
        other_teacher.groups.add(
            Group.objects.get(name="Teacher")
        )
        self.client.force_authenticate(user=other_teacher)

        response = self.client.get(
            f"/api/courses/{self.course.id}/progress/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_progress_requires_authentication(self):
        response = self.client.get(
            f"/api/courses/{self.course.id}/progress/"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
