from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.auth_list, name="auth-list"),
]