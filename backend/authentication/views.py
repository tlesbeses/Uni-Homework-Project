from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenBlacklistSerializer
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .csrf import assert_csrf, set_csrf_cookie
from .serializers import LoginSerializer

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth/"


def _set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=int(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
        ),
        secure=not settings.DEBUG,
        httponly=True,
        samesite="Lax",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


class CsrfView(APIView):
    """Entrega el token CSRF inicial para habilitar el patrón double-submit."""

    permission_classes = [AllowAny]

    def get(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        set_csrf_cookie(response)
        return response


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        assert_csrf(request)

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        data = dict(serializer.validated_data)
        refresh_token = data.pop("refresh", None)

        response = Response(data, status=status.HTTP_200_OK)
        if refresh_token:
            _set_refresh_cookie(response, refresh_token)
        set_csrf_cookie(response)
        return response


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        assert_csrf(request)

        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise InvalidToken("Refresh token cookie is missing.")

        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        data = dict(serializer.validated_data)
        rotated_token = data.pop("refresh", None)

        response = Response(data, status=status.HTTP_200_OK)
        if rotated_token:
            _set_refresh_cookie(response, rotated_token)
        return response


class LogoutView(APIView):
    """Blackliste el refresh token recibido por cookie y limpia las cookies."""

    permission_classes = [AllowAny]

    def post(self, request):
        assert_csrf(request)

        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh_token:
            serializer = TokenBlacklistSerializer(data={"refresh": refresh_token})
            try:
                serializer.is_valid(raise_exception=True)
            except TokenError:
                # Token ya expirado/inválido: el logout igualmente concluye.
                pass

        response = Response({}, status=status.HTTP_200_OK)
        _clear_refresh_cookie(response)
        return response
