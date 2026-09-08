"""Seed demo data so the evolution/progress/print features can be eyeballed.

Creates a teacher, a handful of students, one course with two sections,
published assignments (acumulados y exámenes por parcial with the ponderated
final grade enabled), teams, approved enrollments and grades applied in
stages through the grading services so FinalScoreSnapshot accumulates real
evolution points and notifications fire.

The command is idempotent: it always wipes the demo users and demo course
first and rebuilds them (evolution points and notifications included), so it
can be executed repeatedly to refresh the dataset.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from assignments.models import Assignment, AssignmentCategory, AssignmentParcial
from course.models import Course, CourseSettings, Section, Visibility
from course.services import approve_enrollment, create_enrollment
from grading.services import grade_student, grade_team
from teams.models import Team, TeamMember

User = get_user_model()

PASSWORD = "Demo1234!"

TEACHERS = [
    ("profesor.demo", "profesor.demo@example.com", "Profesor Demo", "Profesor"),
]

STUDENTS = [
    ("ana.perez", "Ana", "Perez"),
    ("luis.garcia", "Luis", "Garcia"),
    ("maria.lopez", "Maria", "Lopez"),
    ("carlos.martin", "Carlos", "Martin"),
    ("laura.sanchez", "Laura", "Sanchez"),
    ("pedro.ramirez", "Pedro", "Ramirez"),
]


class Command(BaseCommand):
    help = "Seed demo data (users, course, sections, teams, assignments, grades)."

    def handle(self, *args, **options):
        teacher_group = Group.objects.get(name="Teacher")

        Course.objects.filter(title="Programación Web 2026").delete()
        User.objects.filter(
            username__in=[TEACHERS[0][0]] + [u[0] for u in STUDENTS]
        ).delete()

        teacher = User.objects.create(
            username=TEACHERS[0][0],
            email=TEACHERS[0][1],
            first_name=TEACHERS[0][2],
            last_name=TEACHERS[0][3],
            is_active=True,
        )
        teacher.set_password(PASSWORD)
        teacher.groups.add(teacher_group)
        teacher.save()

        students = []
        for username, first, last in STUDENTS:
            student = User.objects.create(
                username=username,
                email=f"{username}@example.com",
                first_name=first,
                last_name=last,
                is_active=True,
            )
            student.set_password(PASSWORD)
            student.save()
            students.append(student)

        course = Course.objects.create(
            title="Programación Web 2026",
            description="Curso demo: backend Django + frontend React.",
            teacher=teacher,
            visibility=Visibility.PUBLIC,
        )
        CourseSettings.objects.update_or_create(
            course=course,
            defaults={
                "ponderacion_enabled": True,
                "p1_acumulado_pct": Decimal("15.00"),
                "p1_examen_pct": Decimal("35.00"),
                "p2_acumulado_pct": Decimal("35.00"),
                "p2_examen_pct": Decimal("15.00"),
            },
        )
        section_a = Section.objects.create(course=course, name="1TS1")
        section_b = Section.objects.create(course=course, name="2TS2")

        for student in students[:3]:
            enrollment = create_enrollment(
                section=section_a,
                student=student,
                actor=teacher,
            )
            approve_enrollment(enrollment=enrollment, actor=teacher)

        for student in students[3:]:
            enrollment = create_enrollment(
                section=section_b,
                student=student,
                actor=teacher,
            )
            approve_enrollment(enrollment=enrollment, actor=teacher)

        team_a = Team.objects.create(name="Equipo Alpha", section=section_a, leader=students[0])
        TeamMember.objects.create(team=team_a, student=students[1], course=course)
        team_b = Team.objects.create(name="Equipo Beta", section=section_b, leader=students[3])
        TeamMember.objects.create(team=team_b, student=students[4], course=course)

        assignments = [
            Assignment.objects.create(
                course=course,
                title="Examen parcial",
                description="Primera evaluación escrita.",
                max_score=Decimal("100"),
                weight=Decimal("1.50"),
                category=AssignmentCategory.EXAMEN,
                parcial=AssignmentParcial.PRIMERO,
            ),
            Assignment.objects.create(
                course=course,
                title="Trabajo práctico",
                description="Proyecto en equipo.",
                max_score=Decimal("100"),
                weight=Decimal("1.00"),
                category=AssignmentCategory.ACUMULADO,
                parcial=AssignmentParcial.PRIMERO,
            ),
            Assignment.objects.create(
                course=course,
                title="Examen final",
                description="Evaluación final individual.",
                max_score=Decimal("100"),
                weight=Decimal("2.00"),
                category=AssignmentCategory.EXAMEN,
                parcial=AssignmentParcial.SEGUNDO,
            ),
            Assignment.objects.create(
                course=course,
                title="Taller de repaso (borrador)",
                description="Corrección manual pendiente, oculto a estudiantes.",
                max_score=Decimal("50"),
                weight=Decimal("0.50"),
                is_published=False,
                category=AssignmentCategory.ACUMULADO,
                parcial=AssignmentParcial.SEGUNDO,
            ),
        ]

        parcial, practico, final = assignments[0], assignments[1], assignments[2]

        stage_scores = {
            "ana.perez": {"parcial": 55, "practico": 70, "final": 88},
            "luis.garcia": {"parcial": 62, "practico": 65, "final": 74},
            "maria.lopez": {"parcial": 80, "practico": 90, "final": 95},
            "carlos.martin": {"parcial": 45, "practico": 58, "final": 66},
            "laura.sanchez": {"parcial": 70, "practico": 75, "final": 82},
            "pedro.ramirez": {"parcial": 38, "practico": 50, "final": 60},
        }
        by_username = {s.username: s for s in students}

        grade_team(assignment=parcial, team=team_a, score=Decimal("70"), graded_by=teacher)
        grade_team(assignment=parcial, team=team_b, score=Decimal("62"), graded_by=teacher)
        for username, scores in stage_scores.items():
            grade_student(
                assignment=parcial,
                student=by_username[username],
                score=Decimal(scores["parcial"]),
                graded_by=teacher,
            )

        grade_team(assignment=practico, team=team_a, score=Decimal("82"), graded_by=teacher)
        grade_team(assignment=practico, team=team_b, score=Decimal("76"), graded_by=teacher)
        for username, scores in stage_scores.items():
            grade_student(
                assignment=practico,
                student=by_username[username],
                score=Decimal(scores["practico"]),
                graded_by=teacher,
            )

        for username, scores in stage_scores.items():
            grade_student(
                assignment=final,
                student=by_username[username],
                score=Decimal(scores["final"]),
                graded_by=teacher,
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo seeded: "
                f"teacher={teacher.username}, students={len(students)}, "
                f"course={course.id} '{course.title}', "
                f"snapshots={course.final_score_snapshots.count()}."
            )
        )
        self.stdout.write(
            f"Usuarios (password {PASSWORD}): "
            + ", ".join([teacher.username] + [s.username for s in students])
        )