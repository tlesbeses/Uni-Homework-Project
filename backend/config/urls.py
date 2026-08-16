from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    path("auth/", include("authentication.urls")),

    path("api/", include("course.urls")),
    path("api/", include("teams.urls")),
    path("api/", include("assignments.urls")),
    path("api/", include("grading.urls")),

    re_path(
        r"^(?!api/|admin/|static/).*$",
        TemplateView.as_view(
            template_name="index.html"
        ),
    ),
]