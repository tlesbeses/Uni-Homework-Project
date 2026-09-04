from django.conf import settings
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


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
