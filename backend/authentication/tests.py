from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

User = get_user_model()


class UserEmailTests(TestCase):
    def test_multiple_users_without_email_can_be_created(self):
        user1 = User.objects.create_user(username="student1", password="pass12345")
        user2 = User.objects.create_user(username="student2", password="pass12345")

        self.assertIsNone(user1.email)
        self.assertIsNone(user2.email)

    def test_user_with_blank_email_is_normalized_to_null(self):
        user = User.objects.create_user(
            username="student1",
            password="pass12345",
            email="",
        )

        user.refresh_from_db()
        self.assertIsNone(user.email)

    def test_email_must_still_be_unique_when_provided(self):
        User.objects.create_user(
            username="student1",
            password="pass12345",
            email="student@example.com",
        )

        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="student2",
                password="pass12345",
                email="student@example.com",
            )


class AuthCookieFlowTests(TestCase):
    def setUp(self):
        User.objects.create_user(username="student1", password="pass12345")
        self.csrf_token = self._bootstrap_csrf()

    def _bootstrap_csrf(self):
        response = self.client.get("/auth/csrf/")
        self.assertEqual(response.status_code, 204)
        return self.client.cookies["csrftoken"].value

    def _csrf_header(self):
        # El login rota la cookie CSRF, así que siempre se lee el valor
        # vigente del jar de cookies del cliente de pruebas.
        return {"x-csrftoken": self.client.cookies["csrftoken"].value}

    def _login(self, with_csrf=True):
        headers = self._csrf_header() if with_csrf else {}
        return self.client.post(
            "/auth/login/",
            {"username": "student1", "password": "pass12345"},
            content_type="application/json",
            headers=headers,
        )

    def _refresh(self):
        return self.client.post(
            "/auth/jwt/refresh/",
            content_type="application/json",
            headers=self._csrf_header(),
        )

    def test_login_returns_access_and_user_but_not_refresh(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("user", response.data)
        self.assertNotIn("refresh", response.data)

    def test_login_sets_httponly_refresh_cookie(self):
        self._login()
        cookie = self.client.cookies["refresh_token"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["path"], "/auth/")
        self.assertEqual(cookie["samesite"], "Lax")

    def test_login_without_csrf_is_rejected(self):
        response = self._login(with_csrf=False)
        self.assertEqual(response.status_code, 403)

    def test_refresh_rotates_cookie_and_returns_only_access(self):
        self._login()
        old_refresh = self.client.cookies["refresh_token"].value

        response = self._refresh()

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)

        new_refresh = self.client.cookies["refresh_token"].value
        self.assertNotEqual(new_refresh, old_refresh)

    def test_refresh_without_csrf_is_rejected(self):
        self._login()
        response = self.client.post(
            "/auth/jwt/refresh/", content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_refresh_ignores_body_token_when_cookie_missing(self):
        self._login()
        del self.client.cookies["refresh_token"]

        # El refresh ya no se acepta por cuerpo; simulamos un intento
        # de usar un token enviado por JSON sin cookie.
        response = self.client.post(
            "/auth/jwt/refresh/",
            {"refresh": "some-stolen-token"},
            content_type="application/json",
            headers=self._csrf_header(),
        )
        self.assertEqual(response.status_code, 401)

    def test_logout_blacklists_cookie_token_and_clears_it(self):
        self._login()
        refresh_value = self.client.cookies["refresh_token"].value

        response = self.client.post(
            "/auth/jwt/blacklist/",
            content_type="application/json",
            headers=self._csrf_header(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.cookies["refresh_token"].value, "")

        # Restauramos manualmente la cookie para probar que el token
        # quedó blacklisteado y ya no puede refrescar.
        self.client.cookies["refresh_token"] = refresh_value
        response = self._refresh()
        self.assertEqual(response.status_code, 401)

    def test_logout_without_csrf_is_rejected(self):
        self._login()
        response = self.client.post(
            "/auth/jwt/blacklist/", content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_djoser_raw_jwt_endpoints_are_removed(self):
        for path in ("/auth/jwt/create/", "/auth/jwt/verify/"):
            response = self.client.post(
                path,
                {"username": "student1", "password": "pass12345"},
                content_type="application/json",
            )
            # 404 = ruta inexistente; 405 = cae al catch-all del SPA (GET only).
            self.assertIn(response.status_code, (404, 405))
