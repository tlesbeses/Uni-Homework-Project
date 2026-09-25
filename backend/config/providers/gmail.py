"""Proveedor de correo: Gmail SMTP.

Configuración fija del relay de Gmail. Del entorno solo se leen la cuenta
(``EMAIL_HOST_USER``) y su app password (``EMAIL_HOST_PASSWORD``). Sin
credenciales cae al backend ``console`` (dev, cada correo se imprime en la
terminal).

Para descomentar el uso de este proveedor en ``config/email_config.py``:
``from config.providers.gmail import *`` y el código de configuración del
backend se elige acá mismo, sin variables de entorno adicionales.
"""

import os

EMAIL_PROVIDER_NAME = "Gmail SMTP"

# Parámetros del relay SMTP de Gmail (valores fijos del proveedor).
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 20

# Credenciales dinámicas: la cuenta Gmail y su app password.
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# Remitente por defecto. Con Gmail la dirección debe ser la cuenta que se
# autentica (EMAIL_HOST_USER); el nombre mostrado es libre.
DEFAULT_FROM_EMAIL = (
    f"EduNotas <{EMAIL_HOST_USER}>"
    if EMAIL_HOST_USER
    else "EduNotas <no-reply@local.edunotas>"
)

# Backend SMTP de Django; sin credenciales se cae a "console" (dev).
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
    else "django.core.mail.backends.console.EmailBackend"
)

# Indica si el proveedor tiene credenciales configuradas (para el diagnóstico
# del botón "Probar envío").
EMAIL_CONFIGURED = bool(EMAIL_HOST_USER and EMAIL_HOST_PASSWORD)

# Variables del backend de Brevo presentes con valores vacíos para mantener
# la misma interfaz de nombres en settings.py.
BREVO_API_KEY = ""
BREVO_SENDER = ""