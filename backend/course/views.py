from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from assignments.models import Assignment
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
    DashboardAssignmentSerializer,
    DashboardCourseSerializer,
    DashboardEnrollmentSerializer,
    DashboardGradeSerializer,
    EnrollmentSerializer,
    SectionSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from grading.exports import build_section_grades_workbook
from grading.models import Grade
from teams.services import remove_student_from_course_teams
from .filters import EnrollmentFilter, SectionFilter
from .permissions import IsCourseTeacherOfSection, IsTeacher, IsStudent

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.select_related(
            "teacher", "settings"
        ).annotate(
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
                status=Status.APPROVED,
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
        queryset = (
            course.sections.select_related(
                "course__teacher", "course__settings"
            )
            .annotate(
                enrollments_count=Count(
                    "enrollments",
                    filter=Q(enrollments__status=Status.APPROVED),
                )
            )
            .order_by("name")
        )
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
        ).exclude(status=Status.REJECTED).exists():
            return Response(
                {"detail": "You already requested to join this course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment = Enrollment.objects.create(
            section=section,
            student=request.user,
        )

        course_settings, _ = CourseSettings.objects.get_or_create(course=course)
        if course_settings.auto_accept_students:
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
        else:
            serializer = CourseSettingsSerializer(course_settings)
        return Response(serializer.data)


# ── Dashboard ────────────────────────────────────────────────────────


class DashboardView(APIView):
    """Single endpoint that returns all data needed by the dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_teacher = user.groups.filter(name="Teacher").exists()
        if is_teacher:
            return self._teacher_dashboard(user)
        return self._student_dashboard(user)

    def _teacher_dashboard(self, user):
        courses = Course.objects.annotate(
            enrollments_count=Count(
                "sections__enrollments",
                filter=Q(sections__enrollments__status=Status.APPROVED),
            )
        ).filter(teacher=user).order_by("-created_at")

        enrollments = Enrollment.objects.filter(
            section__course__teacher=user,
        ).select_related("section__course")

        return Response({
            "type": "teacher",
            "courses": DashboardCourseSerializer(courses, many=True).data,
            "enrollments": DashboardEnrollmentSerializer(enrollments, many=True).data,
        })

    def _student_dashboard(self, user):
        enrollments = Enrollment.objects.filter(
            student=user,
        ).select_related("section__course")

        grades = Grade.objects.select_related(
            "assignment__course",
        ).filter(
            student=user,
            assignment__course__sections__enrollments__student=user,
            assignment__course__sections__enrollments__status=Status.APPROVED,
            assignment__is_published=True,
        ).distinct()

        assignments = Assignment.objects.select_related("course").filter(
            course__sections__enrollments__student=user,
            course__sections__enrollments__status=Status.APPROVED,
            is_published=True,
        ).distinct()

        return Response({
            "type": "student",
            "enrollments": DashboardEnrollmentSerializer(enrollments, many=True).data,
            "grades": DashboardGradeSerializer(grades, many=True).data,
            "assignments": DashboardAssignmentSerializer(assignments, many=True).data,
        })


class SectionViewSet(viewsets.ModelViewSet):
    """Manage the sections of a course.

    Only the teacher that owns the course can create, update or delete its
    sections. Any authenticated user can list/retrieve the sections of the
    courses they can see, so students can pick one when enrolling.
    """

    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SectionFilter
    ordering_fields = ["name", "created_at"]
    search_fields = ["name"]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Section.objects.select_related("course__teacher", "course__settings")
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
                status=Status.APPROVED,
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
            "grades_report",
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

    @action(detail=True, methods=["get"], url_path="grades-report")
    def grades_report(self, request, pk=None):
        """Return section grades as JSON for the HTML report page."""
        section = self.get_object()

        assignments = list(
            Assignment.objects.filter(
                course=section.course,
                is_published=True,
            ).order_by("due_date", "id")
        )

        enrollments = list(
            Enrollment.objects.filter(
                section=section,
                status=Status.APPROVED,
            )
            .select_related("student")
            .order_by(
                "student__first_name",
                "student__last_name",
                "student__username",
            )
        )

        enrollment_ids = [e.student_id for e in enrollments]
        assignment_ids = [a.id for a in assignments]
        scores_by_pair = {}
        if enrollment_ids and assignment_ids:
            for grade in Grade.objects.filter(
                assignment_id__in=assignment_ids,
                student_id__in=enrollment_ids,
            ).only("student_id", "assignment_id", "score"):
                scores_by_pair[(grade.student_id, grade.assignment_id)] = round(
                    float(grade.score), 2
                )

        students = []
        for enrollment in enrollments:
            student = enrollment.student
            name = f"{student.first_name or student.username} {student.last_name or ''}".strip()
            grades_map = {}
            total = 0.0
            for assignment in assignments:
                score = scores_by_pair.get((enrollment.student_id, assignment.id))
                if score is not None:
                    grades_map[str(assignment.id)] = score
                    total += score
            students.append({
                "id": student.id,
                "name": name,
                "grades": grades_map,
                "total": round(total, 2),
            })

        return Response({
            "course": section.course.title,
            "section": section.name,
            "assignments": [
                {
                    "id": a.id,
                    "title": a.title,
                    "max_score": float(a.max_score),
                }
                for a in assignments
            ],
            "students": students,
        })

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
        queryset = Enrollment.objects.select_related(
            "student", "section__course__teacher", "section__course__settings"
        )


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
        course = section.course
        if course.teacher == self.request.user:
            raise PermissionDenied("A teacher cannot enroll in their own course.")
        # El endpoint CRUD genérico equivale a "unirse a un curso público",
        # igual que la action `enroll`. No debe servir para saltarse a cursos
        # privados (que requieren join_code) ni a cursos inactivos.
        if not course.is_active:
            raise PermissionDenied("This course is not active.")
        if course.visibility != Visibility.PUBLIC:
            raise PermissionDenied(
                "This course is private. Join it using its join code instead."
            )

        if Enrollment.objects.filter(
            section__course=course,
            student=self.request.user,
        ).exclude(status=Status.REJECTED).exists():
            raise ValidationError(
                {
                    "section": [
                        "You already have an enrollment request for this course."
                    ]
                }
            )

        enrollment = serializer.save(student=self.request.user)

        course_settings, _ = CourseSettings.objects.get_or_create(course=section.course)
        if course_settings.auto_accept_students:
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
