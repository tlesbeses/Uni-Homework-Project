from django.conf import settings
from rest_framework.permissions import BasePermission


class IsSuperuser(BasePermission):
    """Only root (is_superuser) may access the admin console.

    Requires both is_superuser and the ADMIN_PANEL_ENABLED feature flag, so a
    disabled panel blocks everyone (including admins) until re-enabled.
    """

    message = "Solo los administradores (superusuario) pueden realizar esta acción."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
            and getattr(settings, "ADMIN_PANEL_ENABLED", True)
        )