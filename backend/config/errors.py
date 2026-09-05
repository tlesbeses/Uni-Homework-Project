"""In-house error tracking for the API (no Sentry).

``api_exception_handler`` is wired as the DRF ``EXCEPTION_HANDLER``: it
records any unexpected ``500`` into ``ErrorLog`` (with a public ``error_id``,
keeping the traceback only on the record) and returns a stable, consistent
JSON error envelope. Expected DRF/validation/security errors keep DRF's
default response so the client behavior does not change.
"""

import logging
import traceback

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from authentication.models import ErrorLog

logger = logging.getLogger("edunotas.errors")

# Errores conocidos que no deben ensuciar el tracker (no son bugs).
_NO_LOG_CODES = {
    status.HTTP_400_BAD_REQUEST,
    status.HTTP_401_UNAUTHORIZED,
    status.HTTP_403_FORBIDDEN,
    status.HTTP_404_NOT_FOUND,
    status.HTTP_405_METHOD_NOT_ALLOWED,
    status.HTTP_429_TOO_MANY_REQUESTS,
}


def report_exception(*, exc, request=None, error_id_ref="", source=ErrorLog.SOURCE_SERVER):
    """Persist an exception as an ``ErrorLog`` row and return its error_id."""
    try:
        tb = "".join(
            traceback.format_exception(type(exc), exc, exc.__traceback__)
        ) if exc.__traceback__ is not None else str(exc)
    except Exception:  # pragma: no cover - defensive
        tb = ""

    payload = {
        "error_id_ref": error_id_ref or "",
        "source": source,
        "kind": f"{type(exc).__module__}.{type(exc).__name__}",
        "message": (str(exc) or exc.__class__.__name__)[:2000],
        "traceback": tb[:20000],
        "path": "",
        "method": "",
        "status_code": None,
    }

    if request is not None:
        payload["path"] = request.path
        payload["method"] = request.method or ""
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            payload["user_id"] = user.id

    if source == ErrorLog.SOURCE_CLIENT and hasattr(exc, "client_metadata"):
        payload["client_metadata"] = exc.client_metadata

    try:
        error_log = ErrorLog.objects.create(**payload)
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to persist ErrorLog")
        return error_id

    return error_log.error_id


def _server_error_response(error_id, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR):
    return Response(
        {
            "type": "server_error",
            "error_id": error_id,
            "message": (
                "Ocurrió un error inesperado. Comparte este código de "
                "soporte: " + error_id
            ),
        },
        status=status_code,
    )


def api_exception_handler(exc, context):
    """DRF exception handler that tracks unexpected ``5xx`` errors."""
    request = context.get("request")
    response = drf_exception_handler(exc, context)

    if response is None:
        # El handler de DRF devuelve None para excepciones que no son
        # APIException: convertirlas al mismo envelope JSON en vez de dejar
        # que Django devuelva HTML (repetido si DEBUG=False).
        if isinstance(exc, (Http404,)):
            return Response(
                {"type": "not_found", "detail": "No encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if isinstance(exc, (DjangoPermissionDenied,)):
            return Response(
                {
                    "type": "permission_denied",
                    "detail": "No tienes permiso para realizar esta acción.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        error_id = report_exception(exc=exc, request=request)
        return _server_error_response(error_id)

    status_code = response.status_code
    if status_code and status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        error_id = report_exception(exc=exc, request=request)
        return _server_error_response(error_id, status_code)

    if status_code in _NO_LOG_CODES:
        return response

    return response