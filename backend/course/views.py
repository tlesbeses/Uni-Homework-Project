from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from course.models import (
    Course,
    CourseSettings,
    Enrollment,
    Section,
    Status,
    Visibility,
)
from course.serializers import (
    CourseSerializer,
    CourseSettingsSerializer,
    EnrollmentSerializer,
    SectionSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from grading.exports import build_section_grades_workbook
from teams.services import remove_student_from_course_teams
from .filters import EnrollmentFilter, SectionFilter
from .permissions import IsCourseTeacherOfSection, IsTeacher, IsStudent

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.annotate(
            enrollments_count=Count(
                "sections__enrollments",
                filter=Q(sections__enrollments__status=Status.APPROVED),
            )
        ).order_by("-created_at")
        if user.is_superuser:
            return queryset
        if self.is_teacher(user):
            return queryset.filter(teacher=user)
        is_enrolled = Exists(
            Enrollment.objects.filter(
                section__course=OuterRef("pk"),
                student=user,
            )
        )
        return queryset.filter(
            Q(visibility=Visibility.PUBLIC, is_active=True)
            | Q(is_enrolled)
        )

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]

    @staticmethod
    #poisble refactorizacion si el proyecto crece y ageregar esta funcion como un helper
    #asi no se repite el mismo codigo en varios lugares
    def is_teacher(user):
        return user.groups.filter(name="Teacher").exists()

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=["get"])
    def sections(self, request, pk=None):
        """List the sections of a course."""
        course = self.get_object()
        queryset = course.sections.all()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SectionSerializer(
                page,
                many=True,
                context=self.get_serializer_context(),
            )
            return self.get_paginated_response(serializer.data)
        serializer = SectionSerializer(
            queryset,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    def _create_enrollment_for_section(self, request, course, section_id):
        """Shared enrollment creation used by ``join`` and ``enroll``."""
        available_sections = [
            {"id": section.id, "name": section.name}
            for section in course.sections.all()
        ]

        if section_id is None:
            return Response(
                {
                    "section": ["This field is required."],
                    "available_sections": available_sections,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            section = course.sections.get(pk=section_id)
        except (Section.DoesNotExist, ValueError, TypeError):
            return Response(
                {
                    "detail": "Invalid section for this course.",
                    "available_sections": available_sections,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Enrollment.objects.filter(
            section__course=course,
            student=request.user,
        ).exists():
            return Response(
                {"detail": "You already requested to join this course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment = Enrollment.objects.create(
            section=section,
            student=request.user,
        )

        if course.settings.auto_accept_students:
            enrollment.status = Status.APPROVED
            enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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

        return self._create_enrollment_for_section(
            request,
            course,
            request.data.get("section"),
        )

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response(
                {"detail": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not course.is_active:
            raise PermissionDenied("This course is not active.")
        if course.visibility != Visibility.PUBLIC:
            raise PermissionDenied(
                "Only public courses can be joined directly."
            )
        if course.teacher == request.user:
            return Response(
                {"detail": "You cannot enroll in your own course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return self._create_enrollment_for_section(
            request,
            course,
            request.data.get("section"),
        )

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


class SectionViewSet(viewsets.ModelViewSet):
    """Manage the sections of a course.

    Only the teacher that owns the course can create, update or delete its
    sections. Any authenticated user can list/retrieve the sections of the
    courses they can see, so students can pick one when enrolling.
    """

    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = SectionFilter
    ordering_fields = ["name", "created_at"]
    search_fields = ["name"]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Section.objects.select_related("course__teacher")
            .annotate(
                enrollments_count=Count(
                    "enrollments",
                    filter=Q(enrollments__status=Status.APPROVED),
                )
            )
            .order_by("name")
        )
        if user.is_superuser:
            return queryset
        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(course__teacher=user)
        is_enrolled = Exists(
            Enrollment.objects.filter(
                section__course=OuterRef("course"),
                student=user,
            )
        )
        return queryset.filter(
            Q(course__visibility=Visibility.PUBLIC, course__is_active=True)
            | Q(is_enrolled)
        )

    def get_permissions(self):
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "export_grades",
        ):
            return [IsAuthenticated(), IsCourseTeacherOfSection()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="export-grades")
    def export_grades(self, request, pk=None):
        """Download an Excel workbook with the grades of the section."""
        section = self.get_object()
        content = build_section_grades_workbook(section=section)
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="notas_{section.course.id}_{section.id}.xlsx"'
        )
        return response

    def create(self, request, *args, **kwargs):
        """Restrict section creation to the teacher that owns the course."""
        course_id = request.data.get("course_id")
        if course_id is not None:
            try:
                course = Course.objects.get(pk=course_id)
            except Course.DoesNotExist:
                raise NotFound("Course not found.")
            if not (
                request.user.is_superuser
                or course.teacher_id == request.user.id
            ):
                raise PermissionDenied(
                    "You can only create sections for your own courses."
                )
        return super().create(request, *args, **kwargs)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]


    filter_backends = [DjangoFilterBackend]
    filterset_class = EnrollmentFilter

    def get_queryset(self):
        user = self.request.user
        queryset = Enrollment.objects.all()


        if user.is_superuser:
            return queryset
        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(section__course__teacher=user)
        return queryset.filter(student=user)

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [IsAuthenticated(), IsTeacher()]
        if self.action == "create":
            return [IsAuthenticated(), IsStudent()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        section = serializer.validated_data["section"]
        if section.course.teacher == self.request.user:
            raise PermissionDenied("A teacher cannot enroll in their own course.")

        enrollment = serializer.save(student=self.request.user)

        if section.course.settings.auto_accept_students:
            enrollment.status = Status.APPROVED
            enrollment.save()

    def perform_destroy(self, instance):
        """Delete the enrollment and detach the student from course teams.

        Only approved enrollments can have team memberships, so pending or
        rejected ones are removed without touching teams.
        """
        with transaction.atomic():
            if instance.status == Status.APPROVED:
                remove_student_from_course_teams(
                    student=instance.student,
                    course=instance.section.course,
                )
            instance.delete()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        enrollment = self.get_object()

        if enrollment.status == Status.APPROVED:
            return Response(
                {"detail": "Enrollment is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment.status = Status.APPROVED
        enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        enrollment = self.get_object()

        if enrollment.status == Status.REJECTED:
            return Response(
                {"detail": "Enrollment is already rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Revoking an approval must also detach the student from the
            # course teams, mirroring an enrollment deletion.
            if enrollment.status == Status.APPROVED:
                remove_student_from_course_teams(
                    student=enrollment.student,
                    course=enrollment.section.course,
                )
            enrollment.status = Status.REJECTED
            enrollment.approved_at = None
            enrollment.save()

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)
