"""Tests for the notifications application (triggers + API)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from assignments.models import Assignment
from course.models import Course, CourseSettings, Enrollment, Section, Status
from grading.models import Grade
from notifications.models import Notification, NotificationType
from teams.models import Team

User = get_user_model()


class NotificationBaseTestCase(APITestCase):
    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        self.student_group, _ = Group.objects.get_or_create(name="Student")

        self.teacher = User.objects.create_user(
            username="teacher", email="teacher@example.com", password="pass"
        )
        self.teacher.groups.add(self.teacher_group)

        self.other_teacher = User.objects.create_user(
            username="other_teacher",
            email="other_teacher@example.com",
            password="pass",
        )
        self.other_teacher.groups.add(self.teacher_group)

        self.student = User.objects.create_user(
            username="student", email="student@example.com", password="pass"
        )
        self.student.groups.add(self.student_group)

        self.student2 = User.objects.create_user(
            username="student2", email="student2@example.com", password="pass"
        )
        self.student2.groups.add(self.student_group)

        self.other_student = User.objects.create_user(
            username="other_student",
            email="other_student@example.com",
            password="pass",
        )
        self.other_student.groups.add(self.student_group)

        self.course = Course.objects.create(
            title="Math 101", teacher=self.teacher, visibility="PUBLIC"
        )
        self.section = Section.objects.create(course=self.course, name="1TS1")

        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        self.draft_assignment = Assignment.objects.create(
            course=self.course,
            title="Draft",
            max_score="100.00",
            is_published=False,
        )


def enroll_approved(student, section):
    return Enrollment.objects.create(
        section=section, student=student, status=Status.APPROVED
    )


class EnrollmentNotificationTests(NotificationBaseTestCase):
    def test_manual_approve_notifies_student(self):
        enrollment = Enrollment.objects.create(
            section=self.section, student=self.student, status=Status.PENDING
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notification = Notification.objects.filter(
            recipient=self.student,
            type=NotificationType.ENROLLMENT_APPROVED,
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.payload["course_title"], "Math 101")

    def test_manual_approve_does_not_notify_teacher(self):
        enrollment = Enrollment.objects.create(
            section=self.section, student=self.student, status=Status.PENDING
        )
        self.client.force_authenticate(self.teacher)
        self.client.post(f"/api/enrollments/{enrollment.id}/approve/")
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.teacher,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )

    def test_auto_accept_on_join_notifies_student_not_teacher(self):
        self.course.settings.auto_accept_students = True
        self.course.settings.save()
        self.client.force_authenticate(self.student)
        self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code, "section": self.section.id},
            format="json",
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.teacher,
                type=NotificationType.ENROLLMENT_REQUESTED,
            ).exists()
        )

    def test_pending_enrollment_notifies_teacher(self):
        self.client.force_authenticate(self.student)
        self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code, "section": self.section.id},
            format="json",
        )

        notification = Notification.objects.filter(
            recipient=self.teacher,
            type=NotificationType.ENROLLMENT_REQUESTED,
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.payload["student_id"], self.student.id)

    def test_pending_enrollment_does_not_notify_student_of_approval(self):
        self.client.force_authenticate(self.student)
        self.client.post(
            "/api/courses/join/",
            {"join_code": self.course.join_code, "section": self.section.id},
            format="json",
        )
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )


class GradeNotificationTests(NotificationBaseTestCase):
    def setUp(self):
        super().setUp()
        self.e1 = enroll_approved(self.student, self.section)
        self.e2 = enroll_approved(self.student2, self.section)
        self.team = Team.objects.create(
            name="Team A", section=self.section, leader=self.student
        )
        self.team.members.create(student=self.student2, course=self.course)

    def test_individual_grade_notifies_student_when_published(self):
        self.client.force_authenticate(self.teacher)
        self.client.post(
            f"/api/assignments/{self.assignment.id}/grade-student/",
            {"student": self.student.id, "score": 90},
            format="json",
        )
        notification = Notification.objects.filter(
            recipient=self.student,
            type=NotificationType.GRADE_PUBLISHED,
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(
            notification.payload["assignment_title"], "Homework 1"
        )

    def test_individual_grade_does_not_notify_on_draft_assignment(self):
        self.client.force_authenticate(self.teacher)
        self.client.post(
            f"/api/assignments/{self.draft_assignment.id}/grade-student/",
            {"student": self.student.id, "score": 90},
            format="json",
        )
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.student,
                type=NotificationType.GRADE_PUBLISHED,
            ).exists()
        )

    def test_team_grade_notifies_each_member(self):
        self.client.force_authenticate(self.teacher)
        self.client.post(
            f"/api/assignments/{self.assignment.id}/grade-team/",
            {"team": self.team.id, "score": 85},
            format="json",
        )
        targets = set(
            Notification.objects.filter(
                type=NotificationType.GRADE_PUBLISHED,
            ).values_list("recipient_id", flat=True)
        )
        self.assertEqual(targets, {self.student.id, self.student2.id})

    def test_teacher_is_not_notified_when_grading(self):
        self.client.force_authenticate(self.teacher)
        self.client.post(
            f"/api/assignments/{self.assignment.id}/grade-student/",
            {"student": self.student.id, "score": 90},
            format="json",
        )
        self.assertFalse(
            Notification.objects.filter(recipient=self.teacher).exists()
        )


class NotificationApiTests(NotificationBaseTestCase):
    def setUp(self):
        super().setUp()
        self.notif = Notification.objects.create(
            recipient=self.student,
            type=NotificationType.GRADE_PUBLISHED,
            payload={"assignment_id": 1, "assignment_title": "Homework"},
        )

    def test_list_requires_auth(self):
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_only_sees_own_notifications(self):
        Notification.objects.create(
            recipient=self.student2,
            type=NotificationType.GRADE_PUBLISHED,
        )
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_unread_count(self):
        Notification.objects.create(
            recipient=self.student,
            type=NotificationType.GRADE_PUBLISHED,
        )
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_unread_count_is_zero_when_all_read(self):
        self.notif.is_read = True
        self.notif.save()
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.data["count"], 0)

    def test_mark_single_as_read(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(f"/api/notifications/{self.notif.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_cannot_mark_foreign_notification_as_read(self):
        self.client.force_authenticate(self.student2)
        response = self.client.post(f"/api/notifications/{self.notif.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.notif.refresh_from_db()
        self.assertFalse(self.notif.is_read)

    def test_read_all(self):
        Notification.objects.create(
            recipient=self.student,
            type=NotificationType.GRADE_PUBLISHED,
        )
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/notifications/read-all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 2)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.student,
                is_read=False,
            ).exists()
        )

    def test_read_all_is_scoped_to_user(self):
        Notification.objects.create(
            recipient=self.student2,
            type=NotificationType.GRADE_PUBLISHED,
        )
        self.client.force_authenticate(self.student)
        self.client.post("/api/notifications/read-all/")
        self.student2.refresh_from_db()
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.student2,
                is_read=True,
            ).exists()
        )

    def test_unread_only_filter(self):
        Notification.objects.create(
            recipient=self.student,
            type=NotificationType.GRADE_PUBLISHED,
            is_read=True,
        )
        self.client.force_authenticate(self.student)
        response = self.client.get(
            "/api/notifications/", {"unread_only": "true"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_lazy_sweep_deletes_old_read_notifications(self):
        self.notif.is_read = True
        self.notif.save()
        Notification.objects.filter(pk=self.notif.pk).update(
            created_at=timezone.now() - timedelta(days=40)
        )
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertFalse(Notification.objects.filter(pk=self.notif.pk).exists())

    def test_lazy_sweep_keeps_recent_read_notifications(self):
        self.notif.is_read = True
        self.notif.save()
        self.client.force_authenticate(self.student)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.data["count"], 1)


class NotificationScopeTests(NotificationBaseTestCase):
    def setUp(self):
        super().setUp()
        self.other_course = Course.objects.create(
            title="Physics", teacher=self.other_teacher, visibility="PUBLIC"
        )
        self.other_section = Section.objects.create(
            course=self.other_course, name="1TS1"
        )

    def test_manual_approve_on_foreign_course_is_not_notified(self):
        enrollment = Enrollment.objects.create(
            section=self.other_section,
            student=self.other_student,
            status=Status.PENDING,
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            f"/api/enrollments/{enrollment.id}/approve/"
        )
        self.assertIn(
            response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
        )
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.other_student,
                type=NotificationType.ENROLLMENT_APPROVED,
            ).exists()
        )