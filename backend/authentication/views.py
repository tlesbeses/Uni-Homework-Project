from django.conf import settings
from django.contrib.auth.models import Group
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination
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
from .serializers import (
    AdminUserSerializer,
    ClientErrorSerializer,
    ErrorLogDetailSerializer,
    ErrorLogSerializer,
    EventLogSerializer,
    LoginSerializer,
)
from .services import log_event
from .throttle import AdminThrottle, AuthThrottle, ErrorThrottle, LoginThrottle
from authentication.models import ErrorLog, EventLog, User

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth/"


def _get_user_role(user):
    """Nombre del grupo de rol de un usuario, o None si no tiene rol."""
    if user.groups.filter(name="Teacher").exists():
        return "Teacher"
    if user.groups.filter(name="Student").exists():
        return "Student"
    return None


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
    throttle_classes = [AdminThrottle]

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

        is_active_before = instance.is_active
        role_before = _get_user_role(instance)

        if "is_active" in request.data:
            value = request.data["is_active"]
            if not isinstance(value, bool):
                raise ValidationError(
                    {"is_active": "Este campo debe ser un booleano."}
                )
            instance.is_active = value

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

        changes = {}
        if instance.is_active != is_active_before:
            changes["is_active"] = {
                "from": is_active_before,
                "to": instance.is_active,
            }
        role_after = _get_user_role(instance)
        if role_after != role_before:
            changes["role"] = {"from": role_before, "to": role_after}

        if changes:
            log_event(
                actor=request.user,
                action=EventLog.ACTION_UPDATE,
                entity_type="user",
                entity_id=instance.id,
                target=instance,
                metadata={"changes": changes},
            )

        return Response(AdminUserSerializer(instance).data)


class ImpersonateView(APIView):
    """Emitir un access token del usuario objetivo para probar el sistema.

    Solo se emite el access token (sin refresh): vive en memoria del frontend,
    caduca con su lifetime normal y expira al recargar la página. La acción no
    cambia el estado del usuario objetivo (no hace login ni guarda sesiones).
    """

    permission_classes = [IsSuperuser]
    throttle_classes = [AdminThrottle]

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


class ActivityPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminActivityView(APIView):
    """Historial de actividad (EventLog) para la consola de administración.

    Solo superusuarios. Filtros opcionales: action, entity_type, user_id
    (actor o target) y rango de fechas (from/to en ISO).
    """

    permission_classes = [IsSuperuser]
    pagination_class = ActivityPagination
    throttle_classes = [AdminThrottle]

    def get(self, request):
        qs = EventLog.objects.select_related("actor", "target")

        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        entity_type = request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        user_id = request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(Q(actor_id=user_id) | Q(target_id=user_id))

        date_from = request.query_params.get("from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get("to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        qs = qs.order_by("-created_at")

        paginator = ActivityPagination()
        page = paginator.paginate_queryset(qs, request)
        payload = EventLogSerializer(page, many=True).data
        return paginator.get_paginated_response(payload)


class ErrorLogEndpoint(APIView):
    """Observabilidad in-house de errores.

    - ``GET``: listado paginado (solo superusuarios) para la consola admin.
    - ``POST``: reporte sanitizado de errores del frontend (AllowAny, con
      throttle propio) que devuelve el ``error_id`` público para soporte.
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsSuperuser()]
        return [AllowAny()]

    def get_throttles(self):
        if self.request.method == "POST":
            return [ErrorThrottle()]
        return [AdminThrottle()]

    def get(self, request):
        qs = ErrorLog.objects.all()

        source = request.query_params.get("source")
        if source in (ErrorLog.SOURCE_SERVER, ErrorLog.SOURCE_CLIENT):
            qs = qs.filter(source=source)

        qs = qs.order_by("-created_at")

        paginator = ActivityPagination()
        page = paginator.paginate_queryset(qs, request)
        payload = ErrorLogSerializer(page, many=True).data
        return paginator.get_paginated_response(payload)

    def post(self, request):
        serializer = ClientErrorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = getattr(request, "user", None)
        user_id = user.id if user is not None and user.is_authenticated else None

        error_log = ErrorLog.objects.create(
            source=ErrorLog.SOURCE_CLIENT,
            kind=data.get("kind")[:200],
            message=data.get("message")[:2000],
            traceback=data.get("stack")[:20000],
            path=request.path,
            method=request.method or "",
            user_id=user_id,
            error_id_ref=data.get("error_id_ref")[:16],
            client_metadata={
                "component": data.get("component")[:200],
                "url": data.get("url")[:500],
            },
        )

        return Response(
            {"error_id": error_log.error_id},
            status=status.HTTP_201_CREATED,
        )


class ErrorLogDetailView(APIView):
    """Detalle de un error (con traceback) para la consola admin."""

    permission_classes = [IsSuperuser]
    throttle_classes = [AdminThrottle]
    serializer_class = ErrorLogDetailSerializer

    def get(self, request, pk):
        try:
            error_log = ErrorLog.objects.get(pk=pk)
        except ErrorLog.DoesNotExist:
            raise NotFound("Error no encontrado.")
        return Response(ErrorLogDetailSerializer(error_log).data)
