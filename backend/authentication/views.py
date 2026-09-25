import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
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
from djoser.compat import get_user_email
from djoser.conf import settings as djoser_settings
from djoser.views import UserViewSet as DjoserUserViewSet

from config.errors import report_exception
from config.pagination import ListPagination
from course.permissions import is_teacher

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
from .throttle import (
    AdminThrottle,
    AuthThrottle,
    ErrorThrottle,
    LoginThrottle,
    ResetThrottle,
    TokenThrottle,
)
from authentication.models import ErrorLog, EventLog, User

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth/"

logger = logging.getLogger("edunotas.email")


def _get_user_role(user):
    """Nombre del grupo de rol de un usuario, o None si no tiene rol."""
    if is_teacher(user):
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


class UsersViewSet(DjoserUserViewSet):
    """Endpoints de Djoser con rate limits propios en el flujo de verificación
    y recuperación de contraseña.

    Reutiliza todas las acciones de Djoser (registro, me, set_password,
    activation, resend_activation, reset_password, reset_password_confirm).
    Como las rutas se enlazan con ``as_view(...)`` en urls.py (sin router),
    los kwargs de ``@action`` no aplican; por eso el throttle se elige acá por
    ``self.action``: "reset" (5/min) para los envíos de correo y "token"
    (10/min) para los endpoints que consumen uid+token.
    """

    def get_throttles(self):
        throttles = []
        if self.action in ("reset_password", "resend_activation"):
            throttles.append(ResetThrottle())
        elif self.action in ("activation", "reset_password_confirm"):
            throttles.append(TokenThrottle())
        return throttles + [throttle() for throttle in self.throttle_classes]

    def _send_djoser_email(self, request, email_kind, user):
        """Envía el correo de Djoser capturando cualquier fallo del SMTP.

        Un error del proveedor (p. ej. credenciales Gmail inválidas o un app
        password revocado) se registra en el log del servicio y en ErrorLog
        (con ``error_id`` visible en la consola admin). El endpoint responde
        como si el envío hubiera tenido éxito para no revelar si el correo
        existe (anti-enumeración); el fallo queda visible por otro canal.
        """
        context = {"user": user}
        email_class = (
            djoser_settings.EMAIL.password_reset
            if email_kind == "password_reset"
            else djoser_settings.EMAIL.activation
        )
        to = [get_user_email(user)]
        try:
            email_class(request, context).send(to)
        except Exception as exc:
            logger.exception(
                "Fallo el envío de correo (%s) para %s",
                email_kind,
                getattr(user, "email", "<sin email>"),
            )
            error_id = report_exception(exc=exc, request=request)
            logger.error("Error de correo capturado en ErrorLog con error_id=%s", error_id)

    def reset_password(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.get_user()
        if user:
            self._send_djoser_email(request, "password_reset", user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def resend_activation(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.get_user(is_active=False)
        if not djoser_settings.SEND_ACTIVATION_EMAIL:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        if user:
            self._send_djoser_email(request, "activation", user)
        return Response(status=status.HTTP_204_NO_CONTENT)


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

        user = serializer.user
        log_event(
            actor=user,
            action=EventLog.ACTION_LOGIN,
            entity_type="user",
            entity_id=user.id,
            target=user,
            metadata={
                "roles": list(user.groups.values_list("name", flat=True))
            },
        )

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
    http_method_names = ["get", "patch", "post", "head", "options"]
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

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, *args, **kwargs):
        """Asigna una contraseña nueva a un usuario (solo superusuario).

        Pensado para usuarios que perdieron la contraseña y no tienen (o no
        pueden) usar la recuperación por email: el superusuario les entrega
        una contraseña temporal por otro canal.
        """
        instance = self.get_object()

        if instance.is_superuser:
            raise PermissionDenied(
                "No se puede restablecer la contraseña de un superusuario."
            )

        new_password = request.data.get("new_password")
        if not new_password:
            raise ValidationError(
                {"new_password": "Este campo es obligatorio."}
            )

        try:
            validate_password(new_password, user=instance)
        except DjangoValidationError as e:
            raise ValidationError({"new_password": list(e.messages)})

        instance.set_password(new_password)
        instance.save(update_fields=["password"])

        log_event(
            actor=request.user,
            action=EventLog.ACTION_PASSWORD_RESET,
            entity_type="user",
            entity_id=instance.id,
            target=instance,
            metadata={"by": "admin"},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


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


def _clean_int_param(value, field):
    """Convierte un query param a entero o responde 400 si no lo es."""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({field: "Debe ser un número entero."})


def _clean_date_param(value, field):
    """Convierte un query param a fecha ISO (AAAA-MM-DD) o responde 400."""
    if value is None or value == "":
        return None
    parsed = parse_date(value)
    if parsed is None:
        raise ValidationError(
            {field: "Debe ser una fecha ISO válida (AAAA-MM-DD)."}
        )
    return parsed


class AdminActivityView(APIView):
    """Historial de actividad (EventLog) para la consola de administración.

    Solo superusuarios. Filtros opcionales: action, entity_type, user_id
    (actor o target) y rango de fechas (from/to en ISO). Por defecto excluye
    los eventos de login (métricas efímeras, se purgan a los 30 días); se
    incluyen explícitamente pasando ``action=login``.
    """

    permission_classes = [IsSuperuser]
    pagination_class = ListPagination
    throttle_classes = [AdminThrottle]

    def get(self, request):
        qs = EventLog.objects.select_related(
            "actor", "target"
        ).prefetch_related("actor__groups", "target__groups")

        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        else:
            qs = qs.exclude(action=EventLog.ACTION_LOGIN)

        entity_type = request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        user_id = _clean_int_param(request.query_params.get("user_id"), "user_id")
        if user_id is not None:
            qs = qs.filter(Q(actor_id=user_id) | Q(target_id=user_id))

        date_from = _clean_date_param(request.query_params.get("from"), "from")
        if date_from is not None:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = _clean_date_param(request.query_params.get("to"), "to")
        if date_to is not None:
            qs = qs.filter(created_at__date__lte=date_to)

        qs = qs.order_by("-created_at")

        paginator = ListPagination()
        page = paginator.paginate_queryset(qs, request)
        payload = EventLogSerializer(page, many=True).data
        return paginator.get_paginated_response(payload)


class LoginStatsView(APIView):
    """Métricas de acceso (adopción) para la consola de administración.

    Agrega por día los logins registrados en EventLog: cantidad total de
    logins y usuarios únicos por día, para responder "¿están entrando los
    usuarios (y sobre todo los estudiantes)?". Solo superusuarios. De paso
    limpia perezosamente los eventos de login más viejos que
    ``LOGIN_RETENTION_DAYS`` para que EventLog no crezca sin límite.
    """

    LOGIN_RETENTION_DAYS = 30
    DEFAULT_DAYS = 7
    MAX_DAYS = 90

    permission_classes = [IsSuperuser]
    throttle_classes = [AdminThrottle]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", self.DEFAULT_DAYS))
        except (TypeError, ValueError):
            days = self.DEFAULT_DAYS
        days = max(1, min(days, self.MAX_DAYS))

        cutoff = timezone.now() - timedelta(days=self.LOGIN_RETENTION_DAYS)
        EventLog.objects.filter(
            action=EventLog.ACTION_LOGIN,
            created_at__lt=cutoff,
        ).delete()

        since = (timezone.now() - timedelta(days=days - 1)).date()
        rows = (
            EventLog.objects.filter(
                action=EventLog.ACTION_LOGIN,
                actor__isnull=False,
                created_at__date__gte=since,
            )
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                logins=Count("id"),
                unique_users=Count("actor_id", distinct=True),
            )
            .order_by("day")
        )
        by_day = {row["day"]: row for row in rows}

        today = timezone.now().date()
        per_day = [
            {
                "date": (today - timedelta(days=days - 1 - offset)).isoformat(),
                "logins": by_day.get(today - timedelta(days=days - 1 - offset), {}).get("logins", 0),
                "unique_users": by_day.get(today - timedelta(days=days - 1 - offset), {}).get("unique_users", 0),
            }
            for offset in range(days)
        ]

        totals = EventLog.objects.filter(
            action=EventLog.ACTION_LOGIN,
            actor__isnull=False,
            created_at__date__gte=since,
        ).aggregate(
            logins=Count("id"),
            unique_users=Count("actor_id", distinct=True),
        )

        return Response(
            {
                "days": days,
                "totals": totals,
                "per_day": per_day,
            }
        )


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

        paginator = ListPagination()
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


class TestEmailView(APIView):
    """Diagnóstico del envío de correo (solo superusuario).

    Prueba la conexión SMTP configurada (envío real) y devuelve el detalle
    exacto del fallo si ocurre, sin necesidad de una shell en el deploy.
    Siempre responde 200: en caso de error el detalle viaja en el cuerpo y el
    error se persiste además en ErrorLog (con ``error_id``).
    """

    permission_classes = [IsSuperuser]
    throttle_classes = [AdminThrottle]

    def post(self, request):
        from django.core.mail import EmailMessage, get_connection

        to_email = request.data.get("to") or getattr(request.user, "email", "")
        if not to_email:
            raise ValidationError(
                {"to": "Indica un destinatario o configura un email al superusuario."}
            )

        payload = {
            "backend": settings.EMAIL_BACKEND,
            "host": settings.EMAIL_HOST,
            "port": settings.EMAIL_PORT,
            "tls": settings.EMAIL_USE_TLS,
            "user": settings.EMAIL_HOST_USER,
            "configured": bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD),
            "from_email": settings.DEFAULT_FROM_EMAIL,
            "to": to_email,
            "ok": True,
            "error_id": "",
            "error_type": "",
            "error": "",
        }

        try:
            message = EmailMessage(
                "EduNotas: correo de prueba del SMTP",
                "Si estás leyendo esto, el SMTP configurado funciona.",
                settings.DEFAULT_FROM_EMAIL,
                [to_email],
            )
            get_connection().send_messages([message])
        except Exception as exc:
            payload["ok"] = False
            payload["error_type"] = (
                f"{type(exc).__module__}.{type(exc).__name__}"
            )
            payload["error"] = str(exc)[:2000]
            payload["error_id"] = report_exception(exc=exc, request=request)

        return Response(payload)
