from django.conf import settings


class CspMiddleware:
    """Aplica Content-Security-Policy en modo bloqueo en producción.

    Emite la cabecera Content-Security-Policy a partir de settings.CSP y,
    opcionalmente, Content-Security-Policy-Report-Only a partir de
    settings.CSP_REPORT_ONLY para monitorear violaciones. Se omite en DEBUG.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if settings.DEBUG:
            return response

        csp = getattr(settings, "CSP", None)
        if csp:
            response["Content-Security-Policy"] = csp

        report_only = getattr(settings, "CSP_REPORT_ONLY", None)
        if report_only:
            response["Content-Security-Policy-Report-Only"] = report_only

        return response