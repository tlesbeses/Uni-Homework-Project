from unittest import mock

import requests
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings

from mailing.backends.brevo_api import (
    BREVO_API_URL,
    BrevoApiEmailBackend,
    BrevoApiError,
)


class _FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("no content")
        return self._payload


@override_settings(
    BREVO_API_KEY="xkeys-123",
    BREVO_SENDER="EduNotas <pevin.kevin@gmail.com>",
    EMAIL_TIMEOUT=10,
)
class BrevoApiEmailBackendTests(SimpleTestCase):
    """Unit del backend de envío por la REST API de Brevo (sin red)."""

    def _message(self):
        return EmailMessage(
            "Asunto", "Cuerpo", "origen@example.com", ["destino@example.com"]
        )

    def test_sends_message_via_brevo_api(self):
        with mock.patch("mailing.backends.brevo_api.requests.post") as post:
            post.return_value = _FakeResponse(201, {"messageId": "abc"})
            sent = BrevoApiEmailBackend().send_messages([self._message()])

        self.assertEqual(sent, 1)
        post.assert_called_once()
        kwargs = post.call_args.kwargs
        self.assertEqual(post.call_args.args[0], BREVO_API_URL)
        self.assertEqual(kwargs["timeout"], 10)
        self.assertEqual(kwargs["headers"]["api-key"], "xkeys-123")
        payload = kwargs["json"]
        self.assertEqual(
            payload["sender"], {"name": "EduNotas", "email": "pevin.kevin@gmail.com"}
        )
        self.assertEqual(payload["to"], [{"email": "destino@example.com"}])
        self.assertEqual(payload["subject"], "Asunto")
        self.assertEqual(payload["textContent"], "Cuerpo")

    def test_sends_html_when_available(self):
        message = EmailMultiAlternatives(
            "Asunto", "variante texto", "origen@example.com", ["destino@example.com"]
        )
        message.attach_alternative("<b>variante html</b>", "text/html")

        with mock.patch("mailing.backends.brevo_api.requests.post") as post:
            post.return_value = _FakeResponse(201, {})
            sent = BrevoApiEmailBackend().send_messages([message])

        self.assertEqual(sent, 1)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["htmlContent"], "<b>variante html</b>")
        self.assertEqual(payload["textContent"], "variante texto")

    def test_api_error_raises_brevo_api_error(self):
        with mock.patch("mailing.backends.brevo_api.requests.post") as post:
            post.return_value = _FakeResponse(401, {"message": "invalid key"})
            with self.assertRaises(BrevoApiError) as ctx:
                BrevoApiEmailBackend().send_messages([self._message()])

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("invalid key", str(ctx.exception))

    def test_network_error_propagates(self):
        with mock.patch(
            "mailing.backends.brevo_api.requests.post",
            side_effect=requests.ConnectionError("network is unreachable"),
        ):
            with self.assertRaises(requests.ConnectionError):
                BrevoApiEmailBackend().send_messages([self._message()])

    def test_fail_silently_swallows_errors(self):
        with mock.patch(
            "mailing.backends.brevo_api.requests.post",
            side_effect=requests.ConnectionError("network is unreachable"),
        ):
            sent = BrevoApiEmailBackend(fail_silently=True).send_messages(
                [self._message()]
            )

        self.assertEqual(sent, 0)