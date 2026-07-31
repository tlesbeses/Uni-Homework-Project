from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer, UserSerializer as DjoserUserSerializer

User = get_user_model()

class LoginUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = (
            "username",
            "roles",
            "permissions",
        )

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
    class Meta(DjoserUserSerializer.Meta):
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')  
        read_only_fields = ()   