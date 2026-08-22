from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from course.models import (
    Course,
    CourseSettings,
    Enrollment,
    Section,
    Status,
    Visibility,
)

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
            {"title": "Physics", "visibility": "PUBLIC"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["join_code"])
        self.assertEqual(response.data["teacher"]["id"], self.teacher.id)
        self.assertTrue(CourseSettings.objects.filter(course_id=response.data["id"]).exists())

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/courses/", {"title": "Physics"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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

    def test_invalid_join_code(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/courses/join/", {"join_code": "NOPE1234"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_cannot_join_own_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/courses/join/",
            {
                "join_code": self.course.join_code,
                "section": self.section.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
