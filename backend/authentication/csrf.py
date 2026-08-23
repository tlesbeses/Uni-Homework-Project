import secrets

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

CSRF_COOKIE_NAME = "csrftoken"
CSRF_HEADER_NAME = "X-CSRFToken"
CSRF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7


def set_csrf_cookie(response):
    token = secrets.token_urlsafe(32)
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        max_age=CSRF_COOKIE_MAX_AGE,
        secure=not settings.DEBUG,
        httponly=False,
        samesite="Lax",
        path="/",
    )


def assert_csrf(request):
    header_token = request.headers.get(CSRF_HEADER_NAME)
    cookie_token = request.COOKIES.get(CSRF_COOKIE_NAME)

    if not header_token or not cookie_token:
        raise PermissionDenied("CSRF verification failed.")

    if not secrets.compare_digest(
        header_token.encode("utf-8"), cookie_token.encode("utf-8")
    ):
        raise PermissionDenied("CSRF verification failed.")
