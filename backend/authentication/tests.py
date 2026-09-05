from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from authentication.models import EventLog

User = get_user_model()


class BaseAdminTestCase(APITestCase):
    def setUp(self):
        self.student_group = Group.objects.get_or_create(name="Student")[0]
        self.teacher_group = Group.objects.get_or_create(name="Teacher")[0]

        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass",
            is_staff=True,
            is_superuser=True,
        )

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


class AdminUserListTests(BaseAdminTestCase):
    def test_superuser_can_list_users(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {u["username"] for u in response.data["results"]}
        self.assertIn("admin", usernames)
        self.assertIn("teacher", usernames)
        self.assertIn("student", usernames)

    def test_non_superuser_forbidden(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/auth/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_forbidden(self):
        response = self.client.get("/auth/admin/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_filter(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/users/", {"search": "teach"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {u["username"] for u in response.data["results"]}
        self.assertEqual(usernames, {"teacher"})

    def test_role_filter(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/users/", {"role": "Teacher"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {u["username"] for u in response.data["results"]}
        self.assertEqual(usernames, {"teacher"})


class AdminUserUpdateTests(BaseAdminTestCase):
    def test_deactivate_user(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)

    def test_activate_user(self):
        self.student.is_active = False
        self.student.save()
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)

    def test_promote_student_to_teacher(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"role": "Teacher"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(
            self.student.groups.filter(name="Teacher").exists()
        )
        self.assertFalse(
            self.student.groups.filter(name="Student").exists()
        )

    def test_demote_teacher_to_student(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.teacher.id}/",
            {"role": "Student"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertTrue(
            self.teacher.groups.filter(name="Student").exists()
        )
        self.assertFalse(
            self.teacher.groups.filter(name="Teacher").exists()
        )

    def test_invalid_role_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"role": "Root"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_modify_superuser(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.admin.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_non_superuser_cannot_update(self):
        self.client.force_authenticate(self.student)
        response = self.client.patch(
            f"/auth/admin/users/{self.teacher.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_is_active_string_false_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"is_active": "false"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)

    def test_is_active_non_boolean_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/auth/admin/users/{self.student.id}/",
            {"is_active": "banana"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)


class ImpersonateTests(BaseAdminTestCase):
    def test_superuser_can_impersonate_student(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.student.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["access"]
        decoded = AccessToken(token)
        self.assertEqual(decoded["user_id"], str(self.student.id))
        self.assertEqual(int(decoded["impersonates"]), self.admin.id)

    def test_impersonated_token_acts_as_target(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.student.id},
            format="json",
        )
        self.client.force_authenticate(user=None)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )
        profile = self.client.get("/auth/users/me/")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["username"], "student")
        self.assertIn("Student", profile.data["roles"])

    def test_non_superuser_cannot_impersonate(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.teacher.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_impersonate_superuser(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.admin.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_impersonate_inactive_user(self):
        self.student.is_active = False
        self.student.save()
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.student.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_user_not_found(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": 999999},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_impersonation_creates_event_log(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.student.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = EventLog.objects.filter(action=EventLog.ACTION_IMPERSONATE).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.admin)
        self.assertEqual(log.target, self.student)
        self.assertEqual(log.entity_type, "user")
        self.assertEqual(log.entity_id, self.student.id)
        self.assertEqual(log.metadata, {"admin_id": self.admin.id})

    def test_rejected_impersonation_does_not_create_log(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/auth/admin/impersonate/",
            {"user_id": self.admin.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            EventLog.objects.filter(action=EventLog.ACTION_IMPERSONATE).exists()
        )


class AdminActivityTests(BaseAdminTestCase):
    def test_superuser_can_list_activity_logs(self):
        EventLog.objects.create(
            actor=self.admin,
            target=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/activity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        log = response.data["results"][0]
        self.assertEqual(log["action"], "impersonate")
        self.assertEqual(log["actor"]["id"], self.admin.id)
        self.assertEqual(log["target"]["id"], self.student.id)
        self.assertIn("created_at", log)

    def test_non_superuser_cannot_list_activity_logs(self):
        self.client.force_authenticate(self.student)
        response = self.client.get("/auth/admin/activity/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_filter_by_action(self):
        EventLog.objects.create(
            actor=self.admin,
            target=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        EventLog.objects.create(
            actor=self.teacher,
            action=EventLog.ACTION_UPDATE,
            entity_type="grade",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/auth/admin/activity/", {"action": EventLog.ACTION_UPDATE}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action"], "update")

    def test_activity_filter_by_user_id(self):
        EventLog.objects.create(
            actor=self.admin,
            target=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/auth/admin/activity/", {"user_id": self.teacher.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)


class SerializerRoleTests(BaseAdminTestCase):
    def test_me_exposes_admin_flags(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_superuser"])
        self.assertTrue(response.data["is_staff"])
        self.assertTrue(response.data["is_active"])


class RefreshCsrfSyncTests(APITestCase):
    """El refresh sigue la cookie HttpOnly; si la cookie CSRF caduca antes,
    el refresh responde 403 hasta que el frontend re-sincroniza el doble-envío
    (GET /auth/csrf/) y reintenta. Este test fija ese contrato."""

    def setUp(self):
        teacher_group = Group.objects.get_or_create(name="Teacher")[0]
        self.user = User.objects.create_user(
            username="teacher",
            email="teacher@example.com",
            password="pass",
        )
        self.user.groups.add(teacher_group)

    def _login(self):
        csrf_response = self.client.get("/auth/csrf/")
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
        response = self.client.post(
            "/auth/login/",
            {"username": "teacher", "password": "pass"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def test_refresh_blocked_by_stale_csrf_then_recovers_after_resync(self):
        self._login()
        self.assertIn("refresh_token", self.client.cookies)

        # Cookie CSRF vencida: el navegador ya no la envía, y el refresh
        # responde 403 aunque la sesión siga viva.
        self.client.cookies.pop("csrftoken", None)
        response = self.client.post(
            "/auth/jwt/refresh/",
            {},
            HTTP_X_CSRFTOKEN="stale-token",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Re-sincronización: /auth/csrf/ entrega cookie + token frescos.
        csrf_response = self.client.get("/auth/csrf/")
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)

        # Reintento del refresh: debe funcionar con la sesión aún activa.
        response = self.client.post(
            "/auth/jwt/refresh/",
            {},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("csrfToken", response.data)