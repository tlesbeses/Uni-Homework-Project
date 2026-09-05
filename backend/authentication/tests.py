from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from django.test import RequestFactory, TestCase
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from authentication.models import ErrorLog, EventLog

from config.errors import api_exception_handler

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