"""Proveedor de correo: REST API de Brevo (HTTPS/443).

Render free bloquea el tráfico saliente a los puertos SMTP (25/465/587) desde
sept/2025, así que Gmail SMTP no puede enviar desde ahí. La API de Brevo viaja
por HTTPS (443), que ninguna nube bloquea.

Del entorno solo se lee la clave de API v3 (``BREVO_API_KEY``). El remitente
(``BREVO_SENDER``) debe estar **verificado en Brevo** (Config. de la empresa →
Remitentes: se agrega el email y se confirma la propiedad con un link). Sin
clave cae al backend ``console`` (dev, cada correo se imprime en la terminal).

Este es el proveedor activo por defecto en ``config/email_config.py``.
"""

import os

EMAIL_PROVIDER_NAME = "Brevo API (HTTPS)"

# Valores representativos para el diagnóstico del botón "Probar envío": el
# envío real va por HTTP/HTTPS (443) a api.brevo.com, no por SMTP.
EMAIL_HOST = "api.brevo.com"
EMAIL_PORT = 443
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 20

# Credencial única: clave de API v3 de Brevo (generada en SMTP & API → Claves
# de API). No se commitea; va por entorno (.env local / Render).
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

# Remitente verificado en Brevo. La dirección debe ser la que verificaste;
# el nombre mostrado es libre.
BREVO_SENDER = os.getenv("BREVO_SENDER", "EduNotas <pevin.kevin@gmail.com>")
DEFAULT_FROM_EMAIL = BREVO_SENDER

# El backend SMTP no aplica a Brevo; estos nombres quedan por interfaz estable
# (settings.py sigue leyendo el mismo set de variables).
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""

# Backend de envío por la API de Brevo; sin clave se cae a "console" (dev).
EMAIL_BACKEND = (
    "mailing.backends.brevo_api.BrevoApiEmailBackend"
    if BREVO_API_KEY
    else "django.core.mail.backends.console.EmailBackend"
)

# Indica si el proveedor tiene credenciales configuradas (para el diagnóstico
# del botón "Probar envío").
EMAIL_CONFIGURED = bool(BREVO_API_KEY)