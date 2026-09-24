"""Proveedor de correo: Resend.

Toda la configuración del proveedor está fija en este módulo. Lo único
que se lee del entorno es la API key (``EMAIL_HOST_PASSWORD``) y,
opcionalmente, el remitente (``DEFAULT_FROM_EMAIL``).

La API key se define como variable de entorno ``EMAIL_HOST_PASSWORD`` en
``backend/.env`` (local) o en las variables de entorno del deploy
(Render). Nunca debe ir en el código ni subirse al repositorio.
"""

import os

# Backend SMTP de Django usando el relay de Resend. Fijo.
_EMAIL_BACKEND_SMTP = "django.core.mail.backends.smtp.EmailBackend"
_EMAIL_BACKEND_CONSOLE = "django.core.mail.backends.console.EmailBackend"

# Parámetros del relay SMTP de Resend (valores fijos del proveedor).
EMAIL_HOST = "smtp.resend.com"
EMAIL_PORT = 587
EMAIL_HOST_USER = "resend"
EMAIL_USE_TLS = True

# Única credencial dinámica: la API key del proveedor.
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# Remitente por defecto. En Resend debe ser un dominio verificado, o el
# remitente de prueba "onboarding@resend.dev" mientras se configura el envío
# real (solo entrega al email con el que se creó la cuenta Resend).
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "EduNotas <no-reply@local.edunotas>"
)

# Sin API key (por ejemplo, desarrollo local sin configurar) se cae al
# backend "console", que imprime cada correo en la terminal, para no romper
# el flujo de envío.
EMAIL_BACKEND = _EMAIL_BACKEND_SMTP if EMAIL_HOST_PASSWORD else _EMAIL_BACKEND_CONSOLE