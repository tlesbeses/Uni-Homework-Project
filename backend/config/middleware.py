from django.conf import settings


class CspReportOnlyMiddleware:
    """Agrega Content-Security-Policy-Report-Only en producción.

    Solo reporta violaciones (no bloquea). Usar CSP_REPORT_URI para enviar
    reportes a un endpoint externo o interno.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if settings.DEBUG:
            return response

        csp = getattr(settings, "CSP_REPORT_ONLY", None)
        if csp:
            response["Content-Security-Policy-Report-Only"] = csp

        return response
