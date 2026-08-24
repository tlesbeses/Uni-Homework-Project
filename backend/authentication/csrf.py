import secrets
import string

from django.conf import settings
from django.utils.crypto import get_random_string
from rest_framework.exceptions import PermissionDenied

CSRF_COOKIE_NAME = "csrftoken"
CSRF_HEADER_NAME = "X-CSRFToken"
CSRF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

# Debe coincidir con el formato nativo de Django (CSRF_TOKEN_LENGTH): si la
# cookie tiene otro formato, CsrfViewMiddleware la considera inválida y en
# cada petición genera un secreto propio que pisa nuestro Set-Cookie en
# process_response, junto con sus atributos por defecto.
CSRF_TOKEN_LENGTH = 32


def auth_cookie_secure():
    # SameSite=None solo funciona en contexto cross-site con Secure.
    if settings.AUTH_COOKIE_SAMESITE == "None":
        return True
    return not settings.DEBUG


def set_csrf_cookie(response):
    # Devuelve el token para que la vista pueda exponerlo también en el
    # cuerpo de la respuesta: con frontend y API en orígenes distintos el
    # JavaScript no puede leer la cookie, y el double-submit exige enviar
    # el mismo valor en el header X-CSRFToken.
    token = get_random_string(
        CSRF_TOKEN_LENGTH, string.ascii_letters + string.digits
    )
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        max_age=CSRF_COOKIE_MAX_AGE,
        secure=auth_cookie_secure(),
        httponly=False,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )
    return token


def assert_csrf(request):
    header_token = request.headers.get(CSRF_HEADER_NAME)
    cookie_token = request.COOKIES.get(CSRF_COOKIE_NAME)

    if not header_token or not cookie_token:
        raise PermissionDenied("CSRF verification failed.")

    if not secrets.compare_digest(
        header_token.encode("utf-8"), cookie_token.encode("utf-8")
    ):
        raise PermissionDenied("CSRF verification failed.")
