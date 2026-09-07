from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from django.conf import settings

from config.views import pwa_manifest, pwa_register_sw, pwa_service_worker, spa_index
from authentication.views import ErrorLogDetailView, ErrorLogEndpoint

FRONTEND_DIR = settings.FRONTEND_DIR

urlpatterns = [
    # El panel de Django (DRF) vive en /django-admin/ para no chocar con la
    # ruta /admin de la SPA de React.
    path("django-admin/", admin.site.urls),

    path("auth/", include("authentication.urls")),

    path("api/", include("course.urls")),
    path("api/", include("teams.urls")),
    path("api/", include("assignments.urls")),
    path("api/", include("grading.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/errors/", ErrorLogEndpoint.as_view(), name="error-list"),
    path("api/errors/<int:pk>/", ErrorLogDetailView.as_view(), name="error-detail"),

    path("manifest.json", pwa_manifest),
    path("sw.js", pwa_service_worker),
    path("registerSW.js", pwa_register_sw),
    re_path(r"^workbox-[a-f0-9]+\.js$", lambda r: serve(r, r.path.lstrip("/"), document_root=str(FRONTEND_DIR))),
    re_path(r"^icon-[a-zA-Z0-9-]+\.png$", lambda r: serve(r, r.path.lstrip("/"), document_root=str(FRONTEND_DIR))),
    path("favicon.svg", lambda r: serve(r, "favicon.svg", document_root=str(FRONTEND_DIR))),

    re_path(
        r"^(?!api/|django-admin/?|static/|auth/).*$",
        spa_index,
    ),
]