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
from authentication.models import EventLog, User
from authentication.serializers import (
    AdminUserSerializer,
    EventLogSerializer,
    ImpersonationLogSerializer,
)
from authentication.services import log_event
from course.models import (
    Course,
    CourseSettings,
    Enrollment,
    Section,
    SectionSnapshot,
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
    SectionSnapshotDetailSerializer,
    SectionSnapshotListSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from grading.exports import (
    _snapshot_grades_data,
    build_section_grades_csv,
    build_section_grades_workbook,
    build_section_snapshot_csv,
    build_section_snapshot_workbook,
)
from grading.final import final_grade_for_student
from grading.models import Grade
from notifications.services import (
    notify_enrollment_approved,
    notify_enrollment_requested,
)
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
            | (Q(is_enrolled) & Q(is_active=True))
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
        course = serializer.save(teacher=self.request.user)
        log_event(
            actor=self.request.user,
            action=EventLog.ACTION_CREATE,
            entity_type="course",
            entity_id=course.id,
            metadata={
                "title": course.title,
                "visibility": course.visibility,
                "is_active": course.is_active,
                "teacher_id": course.teacher_id,
            },
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {
            "title": instance.title,
            "description": instance.description,
            "visibility": instance.visibility,
            "is_active": instance.is_active,
        }
        course = serializer.save()
        changes = {}
        after = {
            "title": course.title,
            "description": course.description,
            "visibility": course.visibility,
            "is_active": course.is_active,
        }
        for field in before:
            if before[field] != after[field]:
                changes[field] = {"from": before[field], "to": after[field]}
        log_event(
            actor=self.request.user,
            action=EventLog.ACTION_UPDATE,
            entity_type="course",
            entity_id=course.id,
            metadata={
                "changes": changes if changes else None,
                "visibility": course.visibility,
                "is_active": course.is_active,
            },
        )

    def perform_destroy(self, instance):
        course_id = instance.pk
        title = instance.title
        instance.delete()
        log_event(
            actor=self.request.user,
            action=EventLog.ACTION_DELETE,
            entity_type="course",
            entity_id=course_id,
            metadata={"title": title},
        )

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

        if enrollment.status == Status.APPROVED:
            notify_enrollment_approved(enrollment=enrollment)
        else:
            notify_enrollment_requested(enrollment=enrollment, course=course, section=section)

        log_event(
            actor=request.user,
            action=EventLog.ACTION_CREATE,
            entity_type="enrollment",
            entity_id=enrollment.pk,
            target=enrollment.student,
            metadata={
                "course_id": course.id,
                "section_id": section.pk,
                "student_id": enrollment.student_id,
                "status": enrollment.status,
            },
        )

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
            if request.user != course.teacher:
                raise PermissionDenied(
                    "Only the course teacher can change course settings."
                )

        course_settings, _ = CourseSettings.objects.get_or_create(course=course)

        if request.method == "PATCH":
            auto_accept_before = course_settings.auto_accept_students
            serializer = CourseSettingsSerializer(
                course_settings,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            saved = serializer.save()
            log_event(
                actor=request.user,
                action=EventLog.ACTION_UPDATE,
                entity_type="course_settings",
                entity_id=course_settings.course_id,
                metadata={
                    "course_id": course.id,
                    "auto_accept_students": {
                        "from": auto_accept_before,
                        "to": saved.auto_accept_students,
                    },
                },
            )
        else:
            serializer = CourseSettingsSerializer(course_settings)
        return Response(serializer.data)


# ── Dashboard ────────────────────────────────────────────────────────


class DashboardView(APIView):
    """Single endpoint that returns all data needed by the dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_superuser:
            return self._admin_dashboard()
        is_teacher = user.groups.filter(name="Teacher").exists()
        if is_teacher:
            return self._teacher_dashboard(user)
        return self._student_dashboard(user)

    def _admin_dashboard(self):
        users = User.objects.all()
        courses = Course.objects.all()
        pending_enrollments = Enrollment.objects.filter(
            status=Status.PENDING
        ).count()

        recent_users = users.order_by("-date_joined")[:8]
        recent_courses = courses.annotate(
            enrollments_count=Count(
                "sections__enrollments",
                filter=Q(sections__enrollments__status=Status.APPROVED),
            )
        ).order_by("-created_at")[:8]

        recent_impersonations = (
            EventLog.objects.filter(action=EventLog.ACTION_IMPERSONATE)
            .select_related("actor", "target")
            .order_by("-created_at")[:8]
        )

        recent_activity = (
            EventLog.objects.select_related("actor", "target")
            .order_by("-created_at")[:8]
        )

        return Response({
            "type": "admin",
            "stats": {
                "users_total": users.count(),
                "users_active": users.filter(is_active=True).count(),
                "students": users.filter(groups__name="Student").count(),
                "teachers": users.filter(groups__name="Teacher").count(),
                "courses": courses.count(),
                "pending_enrollments": pending_enrollments,
            },
            "recent_users": AdminUserSerializer(recent_users, many=True).data,
            "recent_impersonations": ImpersonationLogSerializer(
                recent_impersonations, many=True
            ).data,
            "recent_activity": EventLogSerializer(recent_activity, many=True).data,
            "recent_courses": DashboardCourseSerializer(recent_courses, many=True).data,
        })

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
            section__course__is_active=True,
        ).select_related("section__course")

        grades = Grade.objects.select_related(
            "assignment__course",
        ).filter(
            student=user,
            assignment__course__sections__enrollments__student=user,
            assignment__course__sections__enrollments__status=Status.APPROVED,
            assignment__course__is_active=True,
            assignment__is_published=True,
        ).distinct()

        assignments = Assignment.objects.select_related("course").filter(
            course__sections__enrollments__student=user,
            course__sections__enrollments__status=Status.APPROVED,
            course__is_active=True,
            is_published=True,
        ).distinct()

        course_ids = {e.section.course_id for e in enrollments}
        courses = {
            course.id: course
            for course in Course.objects.filter(id__in=course_ids)
        }
        final_scores = {
            str(course_id): (
                str(score) if score is not None else None
            )
            for course_id, course in courses.items()
            for score in [final_grade_for_student(
                course=course,
                student=user,
            )]
        }

        return Response({
            "type": "student",
            "enrollments": DashboardEnrollmentSerializer(enrollments, many=True).data,
            "grades": DashboardGradeSerializer(grades, many=True).data,
            "assignments": DashboardAssignmentSerializer(assignments, many=True).data,
            "final_scores": final_scores,
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
            | (Q(is_enrolled) & Q(course__is_active=True))
        )

    def get_permissions(self):
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "export_grades",
            "export_grades_csv",
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

    @action(detail=True, methods=["get"], url_path="export-grades-csv")
    def export_grades_csv(self, request, pk=None):
        """Download the grades of the section as a CSV file."""
        section = self.get_object()
        content = build_section_grades_csv(section=section)
        response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = (
            f'attachment; filename="notas_{section.course.id}_{section.id}.csv"'
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
            if course.teacher_id != request.user.id:
                raise PermissionDenied(
                    "You can only create sections for your own courses."
                )
        return super().create(request, *args, **kwargs)


class SectionSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """Inspect snapshots captured when a section (or its course) is deleted.

    Superusers see every capture; teachers only the ones from their own
    courses. Students have no snapshot row of their own, so their list is
    simply empty (the same filtering behavior as the rest of the views).
    The frozen grades can be downloaded again from here.
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["course_title", "section_name", "teacher_name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SectionSnapshotDetailSerializer
        return SectionSnapshotListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return SectionSnapshot.objects.all()
        return SectionSnapshot.objects.filter(teacher_id=user.id)

    def _payload_from_snapshot_report(self, snapshot):
        """Render the frozen grades as the live grades-report shape."""
        assignments, enrollments, scores_by_pair = _snapshot_grades_data(
            snapshot.payload
        )

        students = []
        for enrollment in enrollments:
            grades_map = {}
            total = 0.0
            for assignment in assignments:
                score = scores_by_pair.get(
                    (enrollment["student_id"], assignment["id"])
                )
                if score is not None:
                    grades_map[str(assignment["id"])] = round(score, 2)
                    total += score
            students.append(
                {
                    "id": enrollment["student_id"],
                    "name": (
                        f"{enrollment['first_name'] or enrollment['username']} "
                        f"{enrollment['last_name'] or ''}".strip()
                    ),
                    "grades": grades_map,
                    "total": round(total, 2),
                }
            )

        return {
            "course": snapshot.payload["course"]["title"],
            "section": snapshot.payload["section"]["name"],
            "assignments": [
                {
                    "id": assignment["id"],
                    "title": assignment["title"],
                    "max_score": float(assignment["max_score"]),
                }
                for assignment in assignments
            ],
            "students": students,
        }

    @action(detail=True, methods=["get"], url_path="export-grades")
    def export_grades(self, request, pk=None):
        """Download an Excel workbook with the frozen grades."""
        snapshot = self.get_object()
        content = build_section_snapshot_workbook(snapshot.payload)
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="notas_borradas_{snapshot.section_id}.xlsx"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="export-grades-csv")
    def export_grades_csv(self, request, pk=None):
        """Download the frozen grades as a CSV file."""
        snapshot = self.get_object()
        content = build_section_snapshot_csv(snapshot.payload)
        response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = (
            f'attachment; filename="notas_borradas_{snapshot.section_id}.csv"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="grades-report")
    def grades_report(self, request, pk=None):
        """Return the frozen grades as JSON for the report page."""
        snapshot = self.get_object()
        return Response(self._payload_from_snapshot_report(snapshot))


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


        if user.groups.filter(name="Teacher").exists():
            return queryset.filter(section__course__teacher=user)
        return queryset.filter(
            student=user,
            section__course__is_active=True,
        )

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

        if enrollment.status == Status.APPROVED:
            notify_enrollment_approved(enrollment=enrollment)
        else:
            notify_enrollment_requested(enrollment=enrollment, course=section.course, section=section)

        log_event(
            actor=self.request.user,
            action=EventLog.ACTION_CREATE,
            entity_type="enrollment",
            entity_id=enrollment.pk,
            target=enrollment.student,
            metadata={
                "course_id": section.course_id,
                "section_id": section.pk,
                "student_id": enrollment.student_id,
                "status": enrollment.status,
            },
        )

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
            course_id = instance.section.course_id
            student_id = instance.student_id
            status_before = instance.status
            enrollment_id = instance.pk
            instance.delete()
        log_event(
            actor=self.request.user,
            action=EventLog.ACTION_DELETE,
            entity_type="enrollment",
            entity_id=enrollment_id,
            target=instance.student,
            metadata={
                "course_id": course_id,
                "student_id": student_id,
                "status": status_before,
            },
        )

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

        notify_enrollment_approved(enrollment=enrollment)

        log_event(
            actor=request.user,
            action=EventLog.ACTION_UPDATE,
            entity_type="enrollment",
            entity_id=enrollment.pk,
            target=enrollment.student,
            metadata={
                "course_id": enrollment.section.course_id,
                "student_id": enrollment.student_id,
                "status": enrollment.status,
            },
        )

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

        log_event(
            actor=request.user,
            action=EventLog.ACTION_UPDATE,
            entity_type="enrollment",
            entity_id=enrollment.pk,
            target=enrollment.student,
            metadata={
                "course_id": enrollment.section.course_id,
                "student_id": enrollment.student_id,
                "status": enrollment.status,
            },
        )

        serializer = EnrollmentSerializer(
            enrollment,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)
