from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer, UserSerializer as DjoserUserSerializer

from authentication.models import ErrorLog, EventLog

User = get_user_model()

class LoginUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

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
        )
        read_only_fields = ("is_staff", "is_superuser", "is_active")

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())

class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = LoginUserSerializer(self.user).data

        return data
    
class UserCreateSerializer(DjoserUserCreateSerializer):
    class Meta(DjoserUserCreateSerializer.Meta):
        model = User
        # Agregamos first_name y last_name para que Djoser los capture del JSON
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password')

    def perform_create(self, validated_data):
        # Guarda el usuario usando la lógica nativa de Django
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(DjoserUserSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta(DjoserUserSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'is_active', 'roles', 'permissions')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())


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
        return list(obj.groups.values_list("name", flat=True))


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