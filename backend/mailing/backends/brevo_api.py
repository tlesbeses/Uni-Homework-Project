"""Backend de envío de correo por la REST API de Brevo (puerto 443).

Los render free web services bloquean el tráfico saliente a los puertos SMTP
(25, 465 y 587) desde septiembre de 2025, así que cualquier relay por SMTP
(Gmail incluido) falla en producción. HTTPS (443) nunca está bloqueado.

Este backend reemplaza el relay SMTP en producción usando la API v3 de Brevo
(``POST https://api.brevo.com/v3/smtp/email``). Respeta el contrato del
backend SMTP de Django: lanza una excepción cuando el envío falla para que los
flujos existentes (``_send_djoser_email``, ``TestEmailView``) la capturen con
``error_type``/``error_id``.
"""

import logging
import re

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import sanitize_address

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

logger = logging.getLogger("edunotas.email")


class BrevoApiError(Exception):
    """El servidor de Brevo rechazó el envío (HTTP 4xx/5xx)."""

    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Brevo API {status_code}: {detail}")


class BrevoApiEmailBackend(BaseEmailBackend):
    """Envía cada correo con una llamada HTTPS a la API v3 de Brevo.

    Configuración leída de settings (definidos en ``email_config.py``):
      BREVO_API_KEY   clave de API v3 de Brevo (obligatoria).
      BREVO_SENDER    remitente verificado en Brevo: ``"Nombre <email>"``.
      EMAIL_TIMEOUT   timeout (segundos) por llamada HTTPS.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently)
        self.api_key = getattr(settings, "BREVO_API_KEY", "")
        self.sender = getattr(settings, "BREVO_SENDER", "")
        self.timeout = getattr(settings, "EMAIL_TIMEOUT", 30)

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send_one(message)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception(
                    "Fallo el envío por la API de Brevo (fail_silently activo)"
                )
        return sent

    def _send_one(self, message):
        message.recipients()  # valida que haya destinatarios (como smtp)
        payload = {
            "sender": self._parse_sender(),
            "to": [
                {"email": sanitize_address(to, "utf-8")} for to in message.to
            ],
            "subject": message.subject,
        }
        html = next(
            (
                content
                for content, mime in getattr(message, "alternatives", [])
                if mime == "text/html"
            ),
            None,
        )
        if html:
            payload["htmlContent"] = html
        payload["textContent"] = message.body

        response = requests.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "api-key": self.api_key,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            detail = ""
            try:
                detail = response.json().get("message", "")
            except ValueError:
                detail = response.text[:500]
            raise BrevoApiError(response.status_code, detail)

    def _parse_sender(self):
        """Convierte ``"Nombre <email>"`` o ``"email"`` en el objeto sender
        que espera la API de Brevo (``{"name": ..., "email": ...}``)."""
        match = re.match(r"^\s*(.*?)\s*<([^>]+)>\s*$", self.sender)
        if match:
            return {"name": match.group(1), "email": match.group(2)}
        return {"email": self.sender.strip()}