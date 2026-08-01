from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from course.models import Course, CourseSettings, Enrollment

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
            visibility=Course.Visibility.PUBLIC,
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


class EnrollmentTests(BaseCourseTestCase):
    def test_student_joins_by_code(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Enrollment.Status.PENDING)

    def test_duplicate_join_rejected(self):
        Enrollment.objects.create(course=self.course, student=self.student)
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code},
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
            {"join_code": self.course.join_code},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_can_approve_enrollment(self):
        enrollment = Enrollment.objects.create(
            course=self.course,
            student=self.student,
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Enrollment.Status.APPROVED)
        self.assertIsNotNone(response.data["approved_at"])

    def test_student_cannot_approve_enrollment(self):
        enrollment = Enrollment.objects.create(
            course=self.course,
            student=self.student,
        )
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_sees_only_own_enrollments(self):
        Enrollment.objects.create(course=self.course, student=self.student)
        Enrollment.objects.create(course=self.course, student=self.student2)
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
            {"join_code": self.course.join_code},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Enrollment.Status.APPROVED)

    def test_student_can_enroll_directly_in_public_course(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/courses/{self.course.id}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Enrollment.Status.PENDING)

    def test_duplicate_enroll_rejected(self):
        Enrollment.objects.create(course=self.course, student=self.student)
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/courses/{self.course.id}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_enroll_in_private_course(self):
        private_course = Course.objects.create(
            title="Private 101",
            teacher=self.teacher,
            visibility=Course.Visibility.PRIVATE,
        )
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/courses/{private_course.id}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_enroll_in_own_course(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(f"/api/courses/{self.course.id}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enroll_respects_auto_accept(self):
        self.course.settings.auto_accept_students = True
        self.course.settings.save()
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/courses/{self.course.id}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Enrollment.Status.APPROVED)


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
