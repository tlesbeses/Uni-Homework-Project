from django.urls import include, path
from . import views
from rest_framework_simplejwt.views import TokenBlacklistView

urlpatterns = [
    path("", include("djoser.urls")),
    path("", include("djoser.urls.jwt")),
    path("jwt/blacklist/", TokenBlacklistView.as_view(), name="logout"),
    path("login/", views.LoginView.as_view(), name="login"),
]