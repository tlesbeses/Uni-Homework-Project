"""Proveedor de correo: Gmail SMTP.

Toda la configuración del proveedor está fija en este módulo. Lo único
que se lee del entorno es la cuenta Gmail (``EMAIL_HOST_USER``), su app
password (``EMAIL_HOST_PASSWORD``) y, opcionalmente, el remitente
(``DEFAULT_FROM_EMAIL``).

La app password se genera en Google (cuenta → Seguridad → Verificación
en 2 pasos → Contraseñas de aplicación) y se define como variable de
entorno ``EMAIL_HOST_PASSWORD`` en ``backend/.env`` (local) o en las
variables de entorno del deploy (Render). Nunca debe ir en el código ni
subirse al repositorio.

Con Gmail, la dirección del remitente debe ser la cuenta que se
autentica (Google lo fuerza); el nombre mostrado ("EduNotas") sí puede
ser cualquiera.
"""

import os

# Backend SMTP de Django usando el relay de Gmail. Fijo.
_EMAIL_BACKEND_SMTP = "django.core.mail.backends.smtp.EmailBackend"
_EMAIL_BACKEND_CONSOLE = "django.core.mail.backends.console.EmailBackend"

# Parámetros del relay SMTP de Gmail (valores fijos del proveedor).
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Credenciales dinámicas: la cuenta Gmail y su app password.
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# Remitente por defecto. Con Gmail la dirección debe ser la cuenta que
# se autentica (EMAIL_HOST_USER); el nombre mostrado es libre.
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    f"EduNotas <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "EduNotas <no-reply@local.edunotas>",
)

# Sin credenciales (por ejemplo, desarrollo local sin configurar) se cae
# al backend "console", que imprime cada correo en la terminal, para no
# romper el flujo de envío.
EMAIL_BACKEND = (
    _EMAIL_BACKEND_SMTP
    if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
    else _EMAIL_BACKEND_CONSOLE
)