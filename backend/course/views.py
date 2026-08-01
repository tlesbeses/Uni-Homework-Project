from django.db.models import Count, Exists, OuterRef, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from course.models import Course, CourseSettings, Enrollment
from course.serializers import (
    CourseSerializer,
    CourseSettingsSerializer,
    EnrollmentSerializer,
)


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.groups.filter(
            name="Teacher"
        ).exists()


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.groups.filter(
            name="Student"
        ).exists()


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.annotate(
            enrollments_count=Count(
                "enrollments",
                filter=Q(enrollments__status=Enrollment.Status.APPROVED),
            )
        ).order_by("-created_at")
        if user.is_superuser:
            return queryset
        if self.is_teacher(user):
            return queryset.filter(teacher=user)
        is_enrolled = Exists(
            Enrollment.objects.filter(
                course=OuterRef("pk"),
                student=user,
            )
        )
        return queryset.filter(
            Q(visibility=Course.Visibility.PUBLIC, is_active=True)
            | Q(is_enrolled)
        )

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]

    @staticmethod
    def is_teacher(user):
        return user.groups.filter(name="Teacher").exists()

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=False, methods=["post"])
    def join(self, request):
        join_code = request.data.get("join_code")
        if not join_code:
            return Response(
                {"join_code": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            course = Course.objects.get(
                join_code=join_code.upper(),
                is_active=True,
            )
        except Course.DoesNotExist:
            return Response(
                {"detail": "Invalid join code."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if course.teacher == request.user:
            return Response(
                {"detail": "You cannot join your own course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment, created = Enrollment.objects.get_or_create(
            course=course,
            student=request.user,
        )

        if not created:
            return Response(
                {"detail": "You already requested to join this course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if course.settings.auto_accept_students:
            enrollment.status = Enrollment.Status.APPROVED
            enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "patch"])
    def course_settings(self, request, pk=None):
        course = self.get_object()
        if request.method == "PATCH":
            if not (
                request.user.is_superuser or request.user == course.teacher
            ):
                raise PermissionDenied(
                    "Only the course teacher can change course settings."
                )

        course_settings, _ = CourseSettings.objects.get_or_create(course=course)

        if request.method == "PATCH":
            serializer = CourseSettingsSerializer(
                course_settings,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return Response(CourseSettingsSerializer(course_settings).data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Enrollment.objects.all()
        if user.is_superuser:
            return queryset
        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(course__teacher=user)
        return queryset.filter(student=user)

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [IsAuthenticated(), IsTeacher()]
        if self.action == "create":
            return [IsAuthenticated(), IsStudent()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        if course.teacher == self.request.user:
            raise PermissionDenied("A teacher cannot enroll in their own course.")

        enrollment = serializer.save(student=self.request.user)

        if course.settings.auto_accept_students:
            enrollment.status = Enrollment.Status.APPROVED
            enrollment.save()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        enrollment = self.get_object()

        if enrollment.status == Enrollment.Status.APPROVED:
            return Response(
                {"detail": "Enrollment is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment.status = Enrollment.Status.APPROVED
        enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        enrollment = self.get_object()

        if enrollment.status == Enrollment.Status.REJECTED:
            return Response(
                {"detail": "Enrollment is already rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment.status = Enrollment.Status.REJECTED
        enrollment.approved_at = None
        enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)
