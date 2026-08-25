from django.urls import include, path
from . import views

urlpatterns = [
    path("", include("djoser.urls")),
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("jwt/refresh/", views.RefreshView.as_view(), name="token_refresh"),
    path("jwt/blacklist/", views.LogoutView.as_view(), name="logout"),
    path("login/", views.LoginView.as_view(), name="login"),
]
