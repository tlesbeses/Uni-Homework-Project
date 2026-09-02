from django.conf import settings
from django.contrib.auth.models import Group
from rest_framework import status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenBlacklistSerializer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .csrf import CSRF_COOKIE_NAME, assert_csrf, auth_cookie_secure, set_csrf_cookie
from .permissions import IsSuperuser
from .serializers import AdminUserSerializer, LoginSerializer
from .services import log_event
from .throttle import AuthThrottle, LoginThrottle
from authentication.models import EventLog, User

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth/"


def _set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=int(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
        ),
        secure=auth_cookie_secure(),
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_auth_cookies(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


class CsrfView(APIView):
    """Entrega el token CSRF para habilitar el patrón double-submit.

    El token viaja en la cookie y también en el cuerpo: cuando el frontend
    vive en otro origen no puede leer document.cookie, así que necesita el
    valor por JSON (CORS con credenciales ya limita quién puede leerlo).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        response = Response(status=status.HTTP_200_OK)
        csrf_token = set_csrf_cookie(response)
        response.data = {"csrfToken": csrf_token}
        return response


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [LoginThrottle]

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
        # El login rota la cookie CSRF; el nuevo valor viaja en el cuerpo
        # para que un frontend cross-origin pueda seguir enviando el header.
        data["csrfToken"] = set_csrf_cookie(response)
        return response


class RefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]
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
        data["csrfToken"] = set_csrf_cookie(response)
        return response


class LogoutView(APIView):
    """Blackliste el refresh token recibido por cookie y limpia las cookies."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

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
        _clear_auth_cookies(response)
        response.delete_cookie(CSRF_COOKIE_NAME, path="/")
        return response


class AdminUserViewSet(viewsets.ModelViewSet):
    """Consola de administración: listar y moderar cuentas (solo superuser)."""

    permission_classes = [IsSuperuser]
    serializer_class = AdminUserSerializer
    filter_backends = [SearchFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = User.objects.prefetch_related("groups")
        role = self.request.query_params.get("role")
        if role in ("Student", "Teacher"):
            qs = qs.filter(groups__name=role)
        return qs.order_by("-date_joined")

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.is_superuser:
            raise PermissionDenied(
                "No se puede modificar una cuenta de superusuario."
            )

        if "is_active" in request.data:
            instance.is_active = bool(request.data["is_active"])

        role = request.data.get("role")
        if role is not None:
            if role not in ("Student", "Teacher"):
                raise ValidationError(
                    {"role": "El rol debe ser 'Student' o 'Teacher'."}
                )
            student_group = Group.objects.get(name="Student")
            teacher_group = Group.objects.get(name="Teacher")
            if role == "Teacher":
                instance.groups.remove(student_group)
                instance.groups.add(teacher_group)
            else:
                instance.groups.remove(teacher_group)
                instance.groups.add(student_group)

        instance.save()
        return Response(AdminUserSerializer(instance).data)


class ImpersonateView(APIView):
    """Emitir un access token del usuario objetivo para probar el sistema.

    Solo se emite el access token (sin refresh): vive en memoria del frontend,
    caduca con su lifetime normal y expira al recargar la página. La acción no
    cambia el estado del usuario objetivo (no hace login ni guarda sesiones).
    """

    permission_classes = [IsSuperuser]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "Este campo es obligatorio."})

        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise NotFound("Usuario no encontrado.")

        if target.is_superuser:
            raise PermissionDenied(
                "No se puede impersonar a otro superusuario."
            )
        if not target.is_active:
            raise PermissionDenied(
                "El usuario está desactivado y no puede iniciar sesión."
            )

        token = AccessToken.for_user(target)
        token["impersonates"] = request.user.id

        log_event(
            actor=request.user,
            action=EventLog.ACTION_IMPERSONATE,
            entity_type="user",
            entity_id=target.id,
            target=target,
            metadata={"admin_id": request.user.id},
        )

        return Response({"access": str(token)})
