from django.test import SimpleTestCase, override_settings

CSP_POLICY = "default-src 'self';"


@override_settings(DEBUG=False, CSP=CSP_POLICY, CSP_REPORT_ONLY=None)
class CspMiddlewareTests(SimpleTestCase):
    def test_api_keeps_strict_csp(self):
        response = self.client.get("/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Security-Policy"], CSP_POLICY)

    def test_django_admin_login_is_exempt_from_strict_csp(self):
        response = self.client.get("/django-admin/login/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Content-Security-Policy", response.headers)

    def test_django_admin_index_is_exempt_from_strict_csp(self):
        response = self.client.get("/django-admin/")
        self.assertEqual(response.status_code, 302)
        self.assertNotIn("Content-Security-Policy", response.headers)

    def test_django_admin_without_slash_redirects_to_canonical(self):
        response = self.client.get("/django-admin")
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/django-admin/")

    def test_django_admin_without_slash_is_not_served_by_spa(self):
        response = self.client.get("/django-admin")
        self.assertEqual(response.status_code, 301)
        self.assertNotIn("<!doctype html>", response.content.decode().lower())