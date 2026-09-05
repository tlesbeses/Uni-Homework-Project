from django.conf import settings
from rest_framework.throttling import (
    AnonRateThrottle,
    SimpleRateThrottle,
    UserRateThrottle,
)


class _ConditionalThrottleMixin:
    def allow_request(self, request, view):
        if getattr(settings, "DISABLE_THROTTLE", False):
            return True
        return super().allow_request(request, view)


class LoginThrottle(_ConditionalThrottleMixin, AnonRateThrottle):
    scope = "login"


class AuthThrottle(_ConditionalThrottleMixin, UserRateThrottle):
    scope = "auth"


class AdminThrottle(_ConditionalThrottleMixin, UserRateThrottle):
    scope = "admin"


class GradeThrottle(_ConditionalThrottleMixin, UserRateThrottle):
    scope = "grade"


class ErrorThrottle(_ConditionalThrottleMixin, SimpleRateThrottle):
    """Limita el envío de errores del frontend.

    Clave por usuario autenticado o por IP para invitados, ya que el
    endpoint es AllowAny y el default ``anon`` solo cubre a no autenticados.
    """

    scope = "error"

    def get_cache_key(self, request, view):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            ident = f"user-{user.pk}"
        else:
            ident = request.META.get("REMOTE_ADDR") or "-"
        return self.cache_format % {"scope": self.scope, "ident": ident}
