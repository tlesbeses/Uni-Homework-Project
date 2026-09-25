from django.urls import include, path
from . import views
from .views import UsersViewSet

# Solo los endpoints de Djoser que necesitamos, en vez de incluir todos.
djoser_patterns = [
    path("users/", UsersViewSet.as_view({"get": "list", "post": "create"}), name="user-list"),
    path("users/me/", UsersViewSet.as_view({"get": "me", "put": "me", "patch": "me"}), name="user-me"),
    path("users/set_password/", UsersViewSet.as_view({"post": "set_password"}), name="user-set-password"),
    path("users/activation/", UsersViewSet.as_view({"post": "activation"}), name="user-activation"),
    path("users/resend_activation/", UsersViewSet.as_view({"post": "resend_activation"}), name="user-resend-activation"),
    path("users/reset_password/", UsersViewSet.as_view({"post": "reset_password"}), name="user-reset-password"),
    path("users/reset_password_confirm/", UsersViewSet.as_view({"post": "reset_password_confirm"}), name="user-reset-password-confirm"),
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
    path(
        "admin/users/<int:pk>/reset-password/",
        views.AdminUserViewSet.as_view({"post": "reset_password"}),
        name="admin-user-reset-password",
    ),
    path("admin/impersonate/", views.ImpersonateView.as_view(), name="admin-impersonate"),
    path("admin/activity/", views.AdminActivityView.as_view(), name="admin-activity"),
    path("admin/login-stats/", views.LoginStatsView.as_view(), name="admin-login-stats"),
    path("admin/test-email/", views.TestEmailView.as_view(), name="admin-test-email"),
]
