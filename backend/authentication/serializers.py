from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer, UserSerializer as DjoserUserSerializer

from authentication.models import ErrorLog, EventLog

User = get_user_model()

class LoginUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    admin_panel_enabled = serializers.SerializerMethodField()
    terms_current_version = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_superuser",
            "is_active",
            "roles",
            "permissions",
            "admin_panel_enabled",
            "terms_accepted_at",
            "terms_version",
            "terms_current_version",
        )
        read_only_fields = (
            "is_staff",
            "is_superuser",
            "is_active",
            "terms_accepted_at",
            "terms_version",
        )

    def get_roles(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())

    def get_admin_panel_enabled(self, obj):
        return getattr(settings, "ADMIN_PANEL_ENABLED", True)

    def get_terms_current_version(self, obj):
        return getattr(settings, "TERMS_VERSION", "")

class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = LoginUserSerializer(self.user).data

        return data
    
class UserCreateSerializer(DjoserUserCreateSerializer):
    # Campo de solo entrada: no es una columna del modelo. El usuario debe
    # aceptar explícitamente los Términos y Condiciones y la Política de
    # Privacidad para poder registrarse; la aceptación se sella con fecha y
    # versión (settings.TERMS_VERSION) al crear la cuenta.
    accept_terms = serializers.BooleanField(
        write_only=True,
        error_messages={
            "required": (
                "Debés aceptar los Términos y Condiciones y la Política de "
                "Privacidad."
            ),
            "invalid": (
                "Debés aceptar los Términos y Condiciones y la Política de "
                "Privacidad."
            ),
        },
    )

    class Meta(DjoserUserCreateSerializer.Meta):
        model = User
        # Agregamos first_name y last_name para que Djoser los capture del JSON
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'accept_terms',
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # El email es obligatorio al registrarse: sin email no se puede
        # enviar el correo de activación ni recuperar la contraseña. Se
        # mantiene el UniqueValidator que genera el ModelSerializer.
        if self.fields.get("email"):
            self.fields["email"].required = True
            self.fields["email"].allow_blank = False

    def validate(self, attrs):
        # Djoser construye ``User(**attrs)`` dentro de su validate, así que
        # ``accept_terms`` (campo que no existe en el modelo) debe quitarse
        # antes de delegar. Se guarda para crear la aceptación en perform_create.
        self._accept_terms = attrs.pop("accept_terms", False)
        if not self._accept_terms:
            raise serializers.ValidationError(
                {
                    "accept_terms": (
                        "Debés aceptar los Términos y Condiciones y la "
                        "Política de Privacidad."
                    )
                }
            )
        return super().validate(attrs)

    def perform_create(self, validated_data):
        # Guarda el usuario usando la lógica nativa de Django.
        # Con verificación de email obligatoria (REQUIRE_EMAIL_VERIFICATION)
        # el usuario nace inactivo y solo puede iniciar sesión tras activar
        # su cuenta desde el correo. Los superusuarios existentes no se ven
        # afectados (no pasan por acá).
        from django.conf import settings as django_settings

        if getattr(self, "_accept_terms", False):
            validated_data["terms_accepted_at"] = timezone.now()
            validated_data["terms_version"] = getattr(
                django_settings, "TERMS_VERSION", ""
            )

        if getattr(django_settings, "REQUIRE_EMAIL_VERIFICATION", True):
            user = User.objects.create_user(is_active=False, **validated_data)
        else:
            user = User.objects.create_user(**validated_data)
        return user


class AcceptTermsSerializer(serializers.Serializer):
    """Sella la aceptación de la versión vigente de los Términos y Condiciones.

    Se usa en el endpoint ``POST /auth/users/accept-terms/`` para los usuarios
    ya registrados cuando se publica una versión nueva de los términos.
    """

    def save(self, **kwargs):
        user = self.context["request"].user
        user.terms_accepted_at = timezone.now()
        user.terms_version = getattr(settings, "TERMS_VERSION", "")
        user.save(update_fields=["terms_accepted_at", "terms_version"])
        return user

class UserSerializer(DjoserUserSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    admin_panel_enabled = serializers.SerializerMethodField()
    terms_current_version = serializers.SerializerMethodField()

    class Meta(DjoserUserSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'is_active', 'roles', 'permissions', 'admin_panel_enabled', 'terms_accepted_at', 'terms_version', 'terms_current_version')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active', 'terms_accepted_at', 'terms_version',)

    def get_roles(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())

    def get_admin_panel_enabled(self, obj):
        return getattr(settings, "ADMIN_PANEL_ENABLED", True)

    def get_terms_current_version(self, obj):
        return getattr(settings, "TERMS_VERSION", "")


class AdminUserSerializer(serializers.ModelSerializer):
    """Representación ligera de un usuario para la consola de administración."""

    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "roles",
            "date_joined",
            "last_login",
        )
        read_only_fields = fields

    def get_roles(self, obj):
        return [group.name for group in obj.groups.all()]


class ImpersonationLogSerializer(serializers.ModelSerializer):
    """Registro de impersonación para el dashboard admin."""

    target = AdminUserSerializer(read_only=True)
    admin = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = EventLog
        fields = ("id", "target", "admin", "timestamp")

    def get_admin(self, obj):
        if obj.actor is None:
            return None
        return AdminUserSerializer(obj.actor).data


class EventLogSerializer(serializers.ModelSerializer):
    """Registro de actividad para la consola de administración."""

    actor = AdminUserSerializer(read_only=True)
    target = AdminUserSerializer(read_only=True)

    class Meta:
        model = EventLog
        fields = (
            "id",
            "action",
            "entity_type",
            "entity_id",
            "actor",
            "target",
            "metadata",
            "created_at",
        )


class ClientErrorSerializer(serializers.Serializer):
    """Campos sanitizados que el frontend envía al reportar un error."""

    kind = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    message = serializers.CharField(max_length=5000, required=False, allow_blank=True, default="")
    stack = serializers.CharField(max_length=40000, required=False, allow_blank=True, default="")
    url = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    component = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    error_id_ref = serializers.CharField(max_length=16, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not any(attrs.get(k) for k in ("kind", "message", "stack", "component")):
            raise serializers.ValidationError(
                {"detail": "Envía al menos 'kind', 'message' o 'stack'."}
            )
        return attrs


class ErrorLogSerializer(serializers.ModelSerializer):
    """Listado de errores para la consola admin (sin traceback)."""

    class Meta:
        model = ErrorLog
        fields = (
            "id",
            "error_id",
            "source",
            "kind",
            "message",
            "path",
            "method",
            "status_code",
            "user_id",
            "created_at",
        )


class ErrorLogDetailSerializer(ErrorLogSerializer):
    """Detalle de un error incluyendo traceback y metadata del cliente."""

    class Meta(ErrorLogSerializer.Meta):
        fields = ErrorLogSerializer.Meta.fields + (
            "traceback",
            "client_metadata",
            "error_id_ref",
        )
        read_only_fields = fields