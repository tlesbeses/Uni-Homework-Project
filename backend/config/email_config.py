"""Proveedor de correo ACTIVO.

Cada proveedor vive en ``config/providers/`` (``gmail.py``, ``brevo.py``)
con TODA su configuración fija en código (host, puerto, TLS, backend, y el
fallback a ``console`` cuando faltan credenciales). Del entorno solo se lee
la credencial secreta de cada proveedor — Gmail: ``EMAIL_HOST_USER`` y
``EMAIL_HOST_PASSWORD``; Brevo: ``BREVO_API_KEY`` — que nunca se commitea.

Para cambiar de proveedor solo se edita UNA línea: la importación de abajo.
"""

# ==================== PROVEEDOR ACTIVO ====================
# Cambiá ESTA línea para cambiar de proveedor:
#
#   - from config.providers.brevo import *   -> REST API de Brevo (HTTPS/443).
#     Recomendado para PRODUCCIÓN: Render free bloquea el SMTP saliente
#     (puertos 25/465/587 desde sept/2025), así que Gmail no puede enviar.
#     Credencial: BREVO_API_KEY (clave v3). Remitente verificado en Brevo.
#
#   - from config.providers.gmail import *   -> Gmail SMTP (smtp.gmail.com:587,
#     TLS). Para dev o entornos con SMTP habilitado. Credenciales:
#     EMAIL_HOST_USER y EMAIL_HOST_PASSWORD (app password con 2FA).
# ===========================================================
from config.providers.brevo import *  # noqa: F401,F403