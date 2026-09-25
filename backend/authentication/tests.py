from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser, Group
from django.core.mail.backends.base import BaseEmailBackend
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from djoser import utils as djoser_utils

from authentication.models import ErrorLog, EventLog

from config.errors import api_exception_handler

User = get_user_model()
encode_uid = djoser_utils.encode_uid


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


class AdminPanelFlagTests(BaseAdminTestCase):
    """El panel admin también exige ADMIN_PANEL_ENABLED (además de rol)."""

    def test_superuser_authorized_when_flag_enabled(self):
        with override_settings(ADMIN_PANEL_ENABLED=True):
            self.client.force_authenticate(self.admin)
            response = self.client.get("/auth/admin/users/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_superuser_forbidden_when_flag_enabled(self):
        with override_settings(ADMIN_PANEL_ENABLED=True):
            self.client.force_authenticate(self.student)
            response = self.client.get("/auth/admin/users/")
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_forbidden_when_flag_enabled(self):
        with override_settings(ADMIN_PANEL_ENABLED=True):
            response = self.client.get("/auth/admin/users/")
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_superuser_forbidden_when_flag_disabled(self):
        with override_settings(ADMIN_PANEL_ENABLED=False):
            self.client.force_authenticate(self.admin)
            response = self.client.get("/auth/admin/users/")
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_profile_exposes_flag(self):
        with override_settings(ADMIN_PANEL_ENABLED=True):
            self.client.force_authenticate(self.admin)
            response = self.client.get("/auth/users/me/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data["admin_panel_enabled"])

    def test_profile_exposes_flag_disabled(self):
        with override_settings(ADMIN_PANEL_ENABLED=False):
            self.client.force_authenticate(self.admin)
            response = self.client.get("/auth/users/me/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertFalse(response.data["admin_panel_enabled"])


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

    def test_activity_excludes_logins_by_default(self):
        EventLog.objects.create(
            actor=self.admin,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )
        EventLog.objects.create(
            actor=self.student,
            action=EventLog.ACTION_LOGIN,
            entity_type="user",
            entity_id=self.student.id,
            target=self.student,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/activity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action"], "impersonate")

    def test_activity_includes_logins_when_filtered_by_action(self):
        EventLog.objects.create(
            actor=self.student,
            action=EventLog.ACTION_LOGIN,
            entity_type="user",
            entity_id=self.student.id,
            target=self.student,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/auth/admin/activity/", {"action": EventLog.ACTION_LOGIN}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action"], "login")


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

    def test_refresh_rotates_and_blacklists_old_token(self):
        self._login()
        old_token = self.client.cookies["refresh_token"].value

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/jwt/refresh/",
            {},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh_token", self.client.cookies)
        new_token = self.client.cookies["refresh_token"].value
        self.assertNotEqual(old_token, new_token)

        # El token viejo queda blacklisteado: un refresh con él debe fallar.
        self.client.cookies["refresh_token"] = old_token
        csrf_response = self.client.get("/auth/csrf/")
        stale_response = self.client.post(
            "/auth/jwt/refresh/",
            {},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(stale_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        self._login()
        old_token = self.client.cookies["refresh_token"].value

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/jwt/blacklist/",
            {},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.cookies["refresh_token"].value, "")

        # El refresh usado queda blacklisteado: su verificación debe fallar.
        with self.assertRaises(TokenError):
            RefreshToken(old_token).verify()


class LoginAuditTests(APITestCase):
    """Todo login exitoso queda registrado en EventLog (auditoría de acceso).

    El frontend ya tenía el filtro y las etiquetas para la acción ``login``;
    esta clase fija que el backend emita el evento con el actor y sus roles
    (para poder medir la adopción por rol desde el panel de administración).
    """

    def setUp(self):
        student_group = Group.objects.get_or_create(name="Student")[0]
        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="pass",
        )
        self.student.groups.add(student_group)

    def _login(self, username="student", password="pass"):
        csrf_response = self.client.get("/auth/csrf/")
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
        return self.client.post(
            "/auth/login/",
            {"username": username, "password": password},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )

    def test_login_success_creates_event_log(self):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log = EventLog.objects.get(action=EventLog.ACTION_LOGIN)
        self.assertEqual(log.actor, self.student)
        self.assertEqual(log.target, self.student)
        self.assertEqual(log.entity_type, "user")
        self.assertEqual(log.entity_id, self.student.id)
        self.assertIn("Student", log.metadata["roles"])

    def test_login_failure_does_not_create_event_log(self):
        response = self._login(password="wrong")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(
            EventLog.objects.filter(action=EventLog.ACTION_LOGIN).exists()
        )

    def test_refresh_does_not_create_login_event(self):
        self._login()
        self.assertEqual(
            EventLog.objects.filter(action=EventLog.ACTION_LOGIN).count(),
            1,
        )

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/jwt/refresh/",
            {},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            EventLog.objects.filter(action=EventLog.ACTION_LOGIN).count(),
            1,
        )


class LoginStatsTests(APITestCase):
    """`GET /auth/admin/login-stats/` agrega logins por día (adopción).

    Solo superusuarios. Devuelve logins y usuarios únicos por día para los
    últimos N días (default 7) y limpia perezosamente los eventos de login
    más viejos que la retención (30 días).
    """

    def setUp(self):
        student_group = Group.objects.get_or_create(name="Student")[0]
        self.admin = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="pass"
        )
        self.student = User.objects.create_user(
            username="student", email="student@example.com", password="pass"
        )
        self.student.groups.add(student_group)
        self.other = User.objects.create_user(
            username="other", email="other@example.com", password="pass"
        )
        self.other.groups.add(student_group)

    def _login_event(self, user, **extra):
        return EventLog.objects.create(
            actor=user,
            action=EventLog.ACTION_LOGIN,
            entity_type="user",
            entity_id=user.id,
            target=user,
            metadata={"roles": ["Student"]},
            **extra,
        )

    def test_superuser_gets_daily_aggregates(self):
        self._login_event(self.student)
        self._login_event(self.student)
        self._login_event(self.other)
        EventLog.objects.create(
            actor=self.admin,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/login-stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(data["days"], 7)
        self.assertEqual(data["totals"]["logins"], 3)
        self.assertEqual(data["totals"]["unique_users"], 2)

        today_iso = timezone.now().date().isoformat()
        today_row = next(day for day in data["per_day"] if day["date"] == today_iso)
        self.assertEqual(today_row["logins"], 3)
        self.assertEqual(today_row["unique_users"], 2)
        self.assertEqual(len(data["per_day"]), 7)

    def test_days_param_clamped(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/login-stats/", {"days": 0})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 1)

        response = self.client.get("/auth/admin/login-stats/", {"days": 9999})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 90)

        response = self.client.get("/auth/admin/login-stats/", {"days": "abc"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 7)

    def test_non_superuser_forbidden(self):
        student_group = Group.objects.get_or_create(name="Student")[0]
        user = User.objects.create_user(
            username="pepe", email="pepe@example.com", password="pass"
        )
        user.groups.add(student_group)
        self.client.force_authenticate(user)
        response = self.client.get("/auth/admin/login-stats/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_forbidden(self):
        response = self.client.get("/auth/admin/login-stats/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_old_login_events_are_cleaned_up(self):
        stale = self._login_event(self.student)
        EventLog.objects.filter(pk=stale.pk).update(
            created_at=timezone.now() - timedelta(days=40)
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/login-stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totals"]["logins"], 0)
        self.assertFalse(
            EventLog.objects.filter(action=EventLog.ACTION_LOGIN).exists()
        )


class LoginThrottleToggleTests(APITestCase):
    def test_login_throttle_disabled_when_disable_throttle_flag_on(self):
        """Con DISABLE_THROTTLE (test/load) el login no devuelve 429."""
        for _ in range(12):
            response = self.client.post(
                "/auth/login/",
                {"username": "nobody", "password": "bad"},
            )
        self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @override_settings(DISABLE_THROTTLE=False)
    def test_login_throttle_applies_when_not_disabled(self):
        """Sin el flag, el LoginThrottle (5/min) corta con 429."""
        last_status = None
        for _ in range(12):
            response = self.client.post(
                "/auth/login/",
                {"username": "nobody", "password": "bad"},
            )
            last_status = response.status_code
            if last_status == status.HTTP_429_TOO_MANY_REQUESTS:
                break
        self.assertEqual(
            last_status,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )


class RefreshThrottleTests(APITestCase):
    """El AuthThrottle ahora clavea por IP: el refresh (anónimo para DRF)
    ya no queda sin límite efectivo."""

    @override_settings(DISABLE_THROTTLE=False)
    def test_refresh_throttle_applies_when_not_disabled(self):
        last_status = None
        for _ in range(15):
            response = self.client.post(
                "/auth/jwt/refresh/",
                {},
                HTTP_X_CSRFTOKEN="x",
            )
            last_status = response.status_code
            if last_status == status.HTTP_429_TOO_MANY_REQUESTS:
                break
        self.assertEqual(
            last_status,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    def test_refresh_throttle_disabled_when_disable_throttle_flag_on(self):
        last_status = None
        for _ in range(15):
            last_status = self.client.post(
                "/auth/jwt/refresh/",
                {},
                HTTP_X_CSRFTOKEN="x",
            ).status_code
        self.assertNotEqual(
            last_status,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )


class RecoveryThrottleTests(APITestCase):
    """Los endpoints anónimos del flujo de recuperación/activación tienen
    throttles propios (scopes "reset" y "token"), claveados por IP o usuario.

    El cache de throttles es compartido entre tests, así que se limpia en
    cada setUp para no contaminar el history de un scope entre casos.
    """

    def setUp(self):
        cache.clear()
        self.payloads = {
            "/auth/users/reset_password/": {"email": "nadie@example.com"},
            "/auth/users/resend_activation/": {"email": "nadie@example.com"},
            "/auth/users/activation/": {"uid": "MQ", "token": "x" * 40},
            "/auth/users/reset_password_confirm/": {
                "uid": "MQ",
                "token": "x" * 40,
                "new_password": "ClaveNueva123",
            },
        }
        self.routes = {
            "reset": ["/auth/users/reset_password/", "/auth/users/resend_activation/"],
            "token": ["/auth/users/activation/", "/auth/users/reset_password_confirm/"],
        }

    @override_settings(DISABLE_THROTTLE=False)
    def test_recovery_throttles_apply_when_not_disabled(self):
        for route in self.routes["reset"] + self.routes["token"]:
            last_status = None
            for _ in range(12):
                response = self.client.post(
                    route,
                    self.payloads[route],
                    format="json",
                )
                last_status = response.status_code
                if last_status == status.HTTP_429_TOO_MANY_REQUESTS:
                    break
            self.assertEqual(
                last_status,
                status.HTTP_429_TOO_MANY_REQUESTS,
                msg=f"{route} debería limitarse con 429",
            )

    def test_recovery_throttles_disabled_when_disable_throttle_flag_on(self):
        for route in self.routes["reset"] + self.routes["token"]:
            last_status = None
            for _ in range(12):
                response = self.client.post(
                    route,
                    self.payloads[route],
                    format="json",
                )
                last_status = response.status_code
            self.assertNotEqual(
                last_status,
                status.HTTP_429_TOO_MANY_REQUESTS,
                msg=f"{route} no debería limitarse con el flag activo",
            )

    @override_settings(DISABLE_THROTTLE=False)
    def test_resend_capping_does_not_share_cuota_with_reset_password(self):
        """Los scopes son independientes: gastar "token" no consume "reset"."""
        for _ in range(12):
            self.client.post(
                "/auth/users/activation/",
                self.payloads["/auth/users/activation/"],
                format="json",
            )
        response = self.client.post(
            "/auth/users/reset_password/",
            self.payloads["/auth/users/reset_password/"],
            format="json",
        )
        self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ClientErrorReportTests(APITestCase):
    def setUp(self):
        teacher_group = Group.objects.get_or_create(name="Teacher")[0]
        self.teacher = User.objects.create_user(
            username="teacher",
            email="teacher@example.com",
            password="pass",
        )
        self.teacher.groups.add(teacher_group)

    def test_anonymous_can_report_client_error(self):
        response = self.client.post(
            "/api/errors/",
            {
                "kind": "TypeError",
                "message": "x is not a function",
                "stack": "at Dashboard (1:1)\nat App (2:2)",
                "component": "Dashboard",
                "url": "/dashboard",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("error_id", response.data)

        log = ErrorLog.objects.get(error_id=response.data["error_id"])
        self.assertEqual(log.source, ErrorLog.SOURCE_CLIENT)
        self.assertEqual(log.kind, "TypeError")
        self.assertEqual(log.message, "x is not a function")
        self.assertIn("at Dashboard", log.traceback)
        self.assertIsNone(log.user_id)
        self.assertEqual(log.path, "/api/errors/")
        self.assertEqual(log.client_metadata["component"], "Dashboard")
        self.assertEqual(log.client_metadata["url"], "/dashboard")

    def test_authenticated_user_is_captured_in_report(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/errors/",
            {"kind": "RangeError", "message": "boom"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = ErrorLog.objects.get(error_id=response.data["error_id"])
        self.assertEqual(log.user_id, self.teacher.id)

    def test_empty_report_is_rejected(self):
        response = self.client.post("/api/errors/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ExceptionHandlerTests(TestCase):
    def _request(self, path="/api/example/"):
        request = RequestFactory().get(path)
        request.user = AnonymousUser()
        return request

    def test_unhandled_exception_returns_error_envelope_and_logs(self):
        request = self._request()
        try:
            raise ValueError("boom")
        except ValueError as exc:
            response = api_exception_handler(exc, {"request": request, "view": None})

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["type"], "server_error")
        error_id = response.data["error_id"]
        self.assertTrue(error_id)

        log = ErrorLog.objects.get(error_id=error_id)
        self.assertEqual(log.source, ErrorLog.SOURCE_SERVER)
        self.assertEqual(log.kind, "builtins.ValueError")
        self.assertEqual(log.message, "boom")
        self.assertIn("ValueError", log.traceback)
        self.assertEqual(log.path, "/api/example/")

    def test_validation_error_passes_through_without_logging(self):
        before = ErrorLog.objects.count()
        request = RequestFactory().post(
            "/api/example/", data={}, content_type="application/json"
        )
        request.user = AnonymousUser()
        exc = ValidationError({"field": ["required"]})

        response = api_exception_handler(exc, {"request": request, "view": None})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ErrorLog.objects.count(), before)

    def test_every_error_gets_its_own_error_id(self):
        from config.errors import report_exception

        error_id_one = report_exception(exc=ValueError("first"))
        error_id_two = report_exception(exc=ValueError("second"))
        self.assertNotEqual(error_id_one, error_id_two)

    def test_report_exception_degrades_gracefully_when_persist_fails(self):
        from config.errors import report_exception

        with patch(
            "config.errors.ErrorLog.objects.create",
            side_effect=Exception("table missing"),
        ):
            result = report_exception(exc=ValueError("boom"))

        self.assertEqual(result, "")


class ErrorLogConsoleTests(BaseAdminTestCase):
    def test_superuser_can_list_errors_without_traceback(self):
        ErrorLog.objects.create(
            source=ErrorLog.SOURCE_CLIENT,
            kind="TypeError",
            message="boom",
            traceback="tracing...",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/errors/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertEqual(row["source"], "client")
        self.assertIn("error_id", row)
        self.assertNotIn("traceback", row)

    def test_non_superuser_cannot_list_errors(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get("/api/errors/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_list_errors(self):
        response = self.client.get("/api/errors/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_superuser_can_read_detail_with_traceback(self):
        log = ErrorLog.objects.create(
            source=ErrorLog.SOURCE_SERVER,
            kind="builtins.ValueError",
            message="boom",
            traceback="Traceback...\nValueError: boom",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(f"/api/errors/{log.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("traceback", response.data)
        self.assertEqual(response.data["traceback"], "Traceback...\nValueError: boom")

    def test_detail_of_missing_error_returns_404(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/errors/999999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_source_filter(self):
        ErrorLog.objects.create(
            source=ErrorLog.SOURCE_CLIENT, kind="TypeError", message="boom"
        )
        ErrorLog.objects.create(
            source=ErrorLog.SOURCE_SERVER, kind="ValueError", message="boom"
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/errors/", {"source": ErrorLog.SOURCE_SERVER})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["kind"], "ValueError")


class AdminActivityFilterTests(BaseAdminTestCase):
    """Los query params del historial de actividad se validan (400, no 500)."""

    def test_invalid_user_id_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/activity/", {"user_id": "abc"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user_id", response.data)

    def test_invalid_from_date_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/activity/", {"from": "ayer"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("from", response.data)

    def test_invalid_to_date_returns_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/auth/admin/activity/", {"to": "not-a-date"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("to", response.data)

    def test_valid_filters_still_filter(self):
        event = EventLog.objects.create(
            actor=self.student,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=self.student.id,
            target=self.student,
        )
        event.created_at = timezone.now()
        event.save()

        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/auth/admin/activity/",
            {"user_id": self.student.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        response = self.client.get(
            "/auth/admin/activity/",
            {"from": timezone.now().date().isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class AccountFlowTests(APITestCase):
    """Flujos de cuenta: registro, edición de perfil y cambio de contraseña.

    El registro usa Djoser (`POST /auth/users/`): crea el usuario, lo asigna
    al grupo Student vía la señal post-save y guarda la contraseña con hash.
    Son flujos críticos de seguridad que quedaban sin cobertura.
    """

    def setUp(self):
        self.student_group = Group.objects.get_or_create(name="Student")[0]

    def _register(self, **overrides):
        payload = {
            "username": "nuevo",
            "email": "nuevo@example.com",
            "first_name": "Nuevo",
            "last_name": "Estudiante",
            "password": "StrongPass123",
        }
        payload.update(overrides)
        return self.client.post("/auth/users/", payload, format="json")

    def test_register_creates_user_with_student_role_and_hashed_password(self):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "nuevo")

        user = User.objects.get(username="nuevo")
        self.assertEqual(user.email, "nuevo@example.com")
        self.assertEqual(user.first_name, "Nuevo")
        self.assertEqual(user.last_name, "Estudiante")
        self.assertIn("Student", list(user.groups.values_list("name", flat=True)))
        self.assertNotEqual(user.password, "StrongPass123")
        self.assertTrue(user.check_password("StrongPass123"))

    def test_register_user_can_login_after_activation(self):
        self._register()

        user = User.objects.get(username="nuevo")
        uid = encode_uid(user.pk)
        token = default_token_generator.make_token(user)
        response = self.client.post(
            "/auth/users/activation/",
            {"uid": uid, "token": token},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        user.refresh_from_db()
        self.assertTrue(user.is_active)

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/login/",
            {"username": "nuevo", "password": "StrongPass123"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_register_with_duplicate_email_is_rejected(self):
        self._register()
        response = self._register(username="otro", email="nuevo@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_with_weak_password_is_rejected(self):
        response = self._register(password="123")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_without_password_is_rejected(self):
        response = self._register(password="")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_update_requires_authentication(self):
        response = self.client.patch(
            "/auth/users/me/", {"first_name": "X"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update_changes_fields(self):
        user = User.objects.create_user(
            username="profe", email="profe@example.com", password="pass"
        )
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/auth/users/me/",
            {
                "first_name": "Ana",
                "last_name": "Garcia",
                "email": "ana@example.com",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertEqual(user.first_name, "Ana")
        self.assertEqual(user.last_name, "Garcia")
        self.assertEqual(user.email, "ana@example.com")

    def test_set_password_changes_password(self):
        user = User.objects.create_user(
            username="clave", email="clave@example.com", password="oldPass1"
        )
        self.client.force_authenticate(user)

        response = self.client.post(
            "/auth/users/set_password/",
            {"new_password": "newPass456", "current_password": "oldPass1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        user.refresh_from_db()
        self.assertFalse(user.check_password("oldPass1"))
        self.assertTrue(user.check_password("newPass456"))

    def test_set_password_requires_authentication(self):
        response = self.client.post(
            "/auth/users/set_password/",
            {"new_password": "newPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_set_password_with_wrong_current_password_is_rejected(self):
        user = User.objects.create_user(
            username="clave2", email="clave2@example.com", password="oldPass1"
        )
        self.client.force_authenticate(user)

        response = self.client.post(
            "/auth/users/set_password/",
            {"new_password": "newPass456", "current_password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        user.refresh_from_db()
        self.assertTrue(user.check_password("oldPass1"))


class AccountActivationTests(APITestCase):
    """Verificación de email obligatoria en los registros nuevos.

    Con REQUIRE_EMAIL_VERIFICATION=True el usuario nace inactivo y solo
    puede iniciar sesión después de activar la cuenta desde el correo.
    """

    def setUp(self):
        self.student_group = Group.objects.get_or_create(name="Student")[0]
        mail.outbox = []

    def _register(self, **overrides):
        payload = {
            "username": "nuevo",
            "email": "nuevo@example.com",
            "first_name": "Nuevo",
            "last_name": "Estudiante",
            "password": "StrongPass123",
        }
        payload.update(overrides)
        return self.client.post("/auth/users/", payload, format="json")

    def _activation_payload(self, user):
        return {
            "uid": encode_uid(user.pk),
            "token": default_token_generator.make_token(user),
        }

    def test_register_creates_inactive_user_and_sends_activation_email(self):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="nuevo")
        self.assertFalse(user.is_active)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("Activa tu cuenta", sent.subject)

    def test_inactive_user_cannot_login(self):
        self._register()
        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/login/",
            {"username": "nuevo", "password": "StrongPass123"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_activation_activates_user_and_allows_login(self):
        self._register()
        user = User.objects.get(username="nuevo")

        response = self.client.post(
            "/auth/users/activation/", self._activation_payload(user), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        user.refresh_from_db()
        self.assertTrue(user.is_active)

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/login/",
            {"username": "nuevo", "password": "StrongPass123"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_activation_sends_confirmation_email(self):
        self._register()
        user = User.objects.get(username="nuevo")
        mail.outbox = []

        self.client.post(
            "/auth/users/activation/", self._activation_payload(user), format="json"
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("fue activada", mail.outbox[0].subject)

    def test_activation_with_invalid_token_rejected(self):
        self._register()
        user = User.objects.get(username="nuevo")

        response = self.client.post(
            "/auth/users/activation/",
            {"uid": encode_uid(user.pk), "token": "token-invalido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_resend_activation_sends_email_again(self):
        self._register()
        mail.outbox = []

        response = self.client.post(
            "/auth/users/resend_activation/", {"email": "nuevo@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_activation_hides_unregistered_email(self):
        response = self.client.post(
            "/auth/users/resend_activation/", {"email": "noexiste@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_register_without_email_is_rejected(self):
        response = self._register(email="")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetFlowTests(APITestCase):
    """Recuperación de contraseña por email (Djoser reset_password)."""

    def setUp(self):
        self.student_group = Group.objects.get_or_create(name="Student")[0]
        mail.outbox = []

    def _user(self, **overrides):
        params = {
            "username": "perdida",
            "email": "perdida@example.com",
            "password": "OldPass123",
        }
        params.update(overrides)
        return User.objects.create_user(**params)

    def test_reset_password_sends_email_with_confirm_url(self):
        user = self._user()

        response = self.client.post(
            "/auth/users/reset_password/", {"email": "perdida@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("Restablecimiento de contraseña", sent.subject)
        self.assertIn("password/reset/confirm/", sent.body)
        self.assertIn(encode_uid(user.pk), sent.body)

    def test_reset_password_hides_whether_email_exists(self):
        response = self.client.post(
            "/auth/users/reset_password/", {"email": "noexiste@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_password_confirm_changes_password(self):
        user = self._user()
        uid = encode_uid(user.pk)
        token = default_token_generator.make_token(user)

        response = self.client.post(
            "/auth/users/reset_password_confirm/",
            {"uid": uid, "token": token, "new_password": "NuevaPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        user.refresh_from_db()
        self.assertFalse(user.check_password("OldPass123"))
        self.assertTrue(user.check_password("NuevaPass456"))

    def test_reset_password_confirm_with_invalid_token_rejected(self):
        user = self._user()

        response = self.client.post(
            "/auth/users/reset_password_confirm/",
            {"uid": encode_uid(user.pk), "token": "token-invalido", "new_password": "NuevaPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        user.refresh_from_db()
        self.assertTrue(user.check_password("OldPass123"))

    def test_login_works_with_new_password_after_reset(self):
        user = self._user()
        token = default_token_generator.make_token(user)

        self.client.post(
            "/auth/users/reset_password_confirm/",
            {
                "uid": encode_uid(user.pk),
                "token": token,
                "new_password": "NuevaPass456",
            },
            format="json",
        )

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/login/",
            {"username": "perdida", "password": "NuevaPass456"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RequireVerificationDisabledTests(APITestCase):
    """Con REQUIRE_EMAIL_VERIFICATION=False el registro activa de inmediato."""

    def setUp(self):
        self.student_group = Group.objects.get_or_create(name="Student")[0]

    @override_settings(REQUIRE_EMAIL_VERIFICATION=False)
    def test_register_creates_active_user(self):
        response = self.client.post(
            "/auth/users/",
            {
                "username": "directo",
                "email": "directo@example.com",
                "first_name": "Directo",
                "last_name": "Usuario",
                "password": "StrongPass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="directo")
        self.assertTrue(user.is_active)


class AdminResetPasswordTests(BaseAdminTestCase):
    """Reset manual de contraseña por superusuario (usuarios sin email)."""

    def test_superuser_resets_user_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/auth/admin/users/{self.student.id}/reset-password/",
            {"new_password": "TempPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password("TempPass456"))

    def test_user_can_login_with_new_password(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            f"/auth/admin/users/{self.student.id}/reset-password/",
            {"new_password": "TempPass456"},
            format="json",
        )

        csrf_response = self.client.get("/auth/csrf/")
        response = self.client.post(
            "/auth/login/",
            {"username": "student", "password": "TempPass456"},
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reset_registers_event_log(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            f"/auth/admin/users/{self.student.id}/reset-password/",
            {"new_password": "TempPass456"},
            format="json",
        )

        log = EventLog.objects.filter(
            action=EventLog.ACTION_PASSWORD_RESET, target_id=self.student.id
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor_id, self.admin.id)

    def test_cannot_reset_superuser_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/auth/admin/users/{self.admin.id}/reset-password/",
            {"new_password": "TempPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_forbidden(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/auth/admin/users/{self.teacher.id}/reset-password/",
            {"new_password": "TempPass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_new_password_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/auth/admin/users/{self.student.id}/reset-password/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/auth/admin/users/{self.student.id}/reset-password/",
            {"new_password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class _FailingEmailBackend(BaseEmailBackend):
    """Backend de prueba que siempre falla al enviar (simula SMTP caído)."""

    def send_messages(self, email_messages):
        raise OSError("smtp no disponible: autenticacion fallida")


class EmailFailureCaptureTests(APITestCase):
    """Los fallos del SMTP se capturan en ErrorLog y por el logger.

    Sin shell en el deploy, un fallo del proveedor de correo (p. ej. credenciales
    Gmail inválidas) debe quedar visible en la consola admin (ErrorLog con
    traceback) y en los logs del servicio, aunque el endpoint responda como
    éxito por anti-enumeración.
    """

    def setUp(self):
        Group.objects.get_or_create(name="Student")
        mail.outbox = []

    def test_reset_password_failure_is_logged_and_returns_204(self):
        User.objects.create_user(
            username="perdida", email="perdida@example.com", password="OldPass123"
        )

        with override_settings(EMAIL_BACKEND="authentication.tests._FailingEmailBackend"):
            response = self.client.post(
                "/auth/users/reset_password/",
                {"email": "perdida@example.com"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)
        log = ErrorLog.objects.get(
            source=ErrorLog.SOURCE_SERVER, kind="builtins.OSError"
        )
        self.assertIn("smtp no disponible", log.message)
        self.assertIn("OSError", log.traceback)
        self.assertEqual(log.path, "/auth/users/reset_password/")

    def test_resend_activation_failure_is_logged_and_returns_204(self):
        User.objects.create_user(
            username="inactivo",
            email="inactivo@example.com",
            password="Pass123",
            is_active=False,
        )

        with override_settings(EMAIL_BACKEND="authentication.tests._FailingEmailBackend"):
            response = self.client.post(
                "/auth/users/resend_activation/",
                {"email": "inactivo@example.com"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            ErrorLog.objects.filter(
                source=ErrorLog.SOURCE_SERVER, kind="builtins.OSError"
            ).count(),
            1,
        )

    def test_reset_password_does_not_leak_when_user_unknown(self):
        with override_settings(EMAIL_BACKEND="authentication.tests._FailingEmailBackend"):
            response = self.client.post(
                "/auth/users/reset_password/",
                {"email": "noexiste@example.com"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ErrorLog.objects.count(), 0)

    def test_reset_password_failure_exposes_trace_to_superuser(self):
        admin = User.objects.create_superuser(
            username="diagnostico",
            email="diagnostico@example.com",
            password="RootPass123",
        )
        User.objects.create_user(
            username="perdida2",
            email="perdida2@example.com",
            password="OldPass123",
        )
        self.client.force_authenticate(admin)

        with override_settings(EMAIL_BACKEND="authentication.tests._FailingEmailBackend"):
            response = self.client.post(
                "/auth/users/reset_password/",
                {"email": "perdida2@example.com"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("email_error", response.data)
        self.assertEqual(
            response.data["email_error"]["error_type"], "builtins.OSError"
        )
        self.assertIn(
            "smtp no disponible",
            response.data["email_error"]["error_message"],
        )
        self.assertTrue(response.data["email_error"]["error_id"])


class TestEmailEndpointTests(BaseAdminTestCase):
    """POST /auth/admin/test-email/: diagnóstico del SMTP sin shell."""

    def test_superuser_gets_ok_with_current_config(self):
        mail.outbox = []
        self.client.force_authenticate(self.admin)

        response = self.client.post("/auth/admin/test-email/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["to"], self.admin.email)
        self.assertTrue(response.data["from_email"])
        self.assertEqual(len(mail.outbox), 1)

    def test_failure_returns_details_and_persists_error(self):
        self.client.force_authenticate(self.admin)

        with override_settings(EMAIL_BACKEND="authentication.tests._FailingEmailBackend"):
            response = self.client.post(
                "/auth/admin/test-email/",
                {"to": "destino@example.com"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ok"])
        self.assertIn("smtp no disponible", response.data["error"])
        self.assertTrue(response.data["error_id"])
        log = ErrorLog.objects.get(
            source=ErrorLog.SOURCE_SERVER, kind="builtins.OSError"
        )
        self.assertEqual(log.error_id, response.data["error_id"])

    def test_missing_recipient_rejected(self):
        self.client.force_authenticate(self.admin)
        self.admin.email = ""
        self.admin.save()

        response = self.client.post("/auth/admin/test-email/", format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_superuser_forbidden(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post("/auth/admin/test-email/", format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_forbidden(self):
        response = self.client.post("/auth/admin/test-email/", format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)