from django.urls import include, path
from . import views

urlpatterns = [
    path("", include("djoser.urls")),
    path("", include("djoser.urls.authtoken")),
]