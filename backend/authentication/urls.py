from django.urls import include, path
from djoser.views import UserViewSet
from . import views

# Solo los 4 endpoints de Djoser que necesitamos, en vez de incluir todos.
djoser_patterns = [
    path("users/", UserViewSet.as_view({"get": "list", "post": "create"}), name="user-list"),
    path("users/me/", UserViewSet.as_view({"get": "me", "put": "me", "patch": "me"}), name="user-me"),
    path("users/set_password/", UserViewSet.as_view({"post": "set_password"}), name="user-set-password"),
    path("users/activation/", UserViewSet.as_view({"post": "activation"}), name="user-activation"),
]

urlpatterns = [
    *djoser_patterns,
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("jwt/refresh/", views.RefreshView.as_view(), name="token_refresh"),
    path("jwt/blacklist/", views.LogoutView.as_view(), name="logout"),
    path("login/", views.LoginView.as_view(), name="login"),
    path(
        "admin/users/",
        views.AdminUserViewSet.as_view({"get": "list"}),
        name="admin-user-list",
    ),
    path(
        "admin/users/<int:pk>/",
        views.AdminUserViewSet.as_view({"patch": "partial_update"}),
        name="admin-user-detail",
    ),
    path("admin/impersonate/", views.ImpersonateView.as_view(), name="admin-impersonate"),
]
