from rest_framework.permissions import BasePermission


class IsSuperuser(BasePermission):
    """Only root (is_superuser) may access the admin console."""

    message = "Solo los administradores (superusuario) pueden realizar esta acción."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )