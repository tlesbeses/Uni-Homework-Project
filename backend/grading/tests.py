"""Tests for the grading application.

Covers the 16 core business rules of the grading module.
"""

import csv
import threading
import unittest
from decimal import Decimal
from io import BytesIO, StringIO

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, connections
from django.test import TransactionTestCase
from django.urls import reverse
from openpyxl import load_workbook
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from assignments.models import Assignment
from authentication.models import EventLog
from course.models import Course, CourseSettings, Enrollment, Section, Status
from grading.final import (
    final_grade_for_student,
    ponderated_breakdown_for_student,
)
from grading.models import FinalScoreSnapshot, Grade
from teams.models import Team, TeamMember

User = get_user_model()


class GradingAPITestCase(APITestCase):
    """Shared fixtures for the grading API tests."""

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")

        self.teacher = self.create_user("teacher")
        self.teacher.groups.add(self.teacher_group)

        self.other_teacher = self.create_user("other_teacher")
        self.other_teacher.groups.add(self.teacher_group)

        self.student = self.create_user("student")
        self.student2 = self.create_user("student2")
        self.unapproved_student = self.create_user("unapproved_student")

        self.course = Course.objects.create(title="Math 101", teacher=self.teacher)
        self.other_course = Course.objects.create(
            title="Physics", teacher=self.other_teacher
        )

        self.enroll(self.student, self.course)
        self.enroll(self.student2, self.course)

        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            max_score="100.00",
            is_published=True,
        )
        self.foreign_assignment = Assignment.objects.create(
            course=self.other_course,
            title="Homework Physics",
            max_score="100.00",
            is_published=True,
        )

        self.team = self.create_team("Team A", [self.student, self.student2])
        self.foreign_team = self.create_team(
            "Team Foreign", [self.student2], course=self.other_course
        )

    @staticmethod
    def create_user(username: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="pass",
        )

    @staticmethod
    def get_section(course) -> Section:
        """Return the default section of a course, creating it if needed."""
        section, _ = Section.objects.get_or_create(course=course, name="Default")
        return section

    @classmethod
    def enroll(cls, student, course) -> Enrollment:
        return Enrollment.objects.create(
            section=cls.get_section(course),
            student=student,
            status=Status.APPROVED,
        )

    def create_team(self, name, members, course=None, leader=None):
        course = course or self.course
        leader = leader or members[0]
        team = Team.objects.create(
            name=name,
            section=self.get_section(course),
            leader=leader,
        )
        for member in members:
            if member != leader:
                TeamMember.objects.create(team=team, student=member)
        return team

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def grade_team(self, assignment, team, score, user=None):
        if user is not None:
            self.authenticate(user)
        return self.client.post(
            reverse(
                "assignment-grade-team",
                kwargs={"assignment_id": assignment.id},
            ),
            {"team": team.id, "score": score},
            format="json",
        )

    def grade_student(self, assignment, student, score, user=None):
        if user is not None:
            self.authenticate(user)
        return self.client.post(
            reverse(
                "assignment-grade-student",
                kwargs={"assignment_id": assignment.id},
            ),
            {"student": student.id, "score": score},
            format="json",
        )


class GradeTeamTests(GradingAPITestCase):
    def test_teacher_can_grade_a_team_of_their_course(self):
        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Grade.objects.count(), 2)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            Grade.objects.filter(
                student=self.student,
                score=Decimal("95.00"),
            ).exists()
        )
        self.assertTrue(
            Grade.objects.filter(
                student=self.student2,
                score=Decimal("95.00"),
            ).exists()
        )

    def test_teacher_cannot_grade_a_team_of_another_course(self):
        response = self.grade_team(self.assignment, self.foreign_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_teacher_cannot_grade_a_course_of_another_teacher(self):
        response = self.grade_team(
            self.foreign_assignment, self.team, "95.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Grade.objects.count(), 0)

    def test_grading_a_team_creates_grades_for_all_members(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        member_ids = set(self.team.members.values_list("student_id", flat=True))
        graded_ids = set(Grade.objects.values_list("student_id", flat=True))
        self.assertEqual(graded_ids, member_ids)

    def test_team_grade_marks_all_grades_as_not_individual(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertFalse(
            Grade.objects.filter(
                assignment=self.assignment,
                is_individual=True,
            ).exists()
        )
        self.assertEqual(
            Grade.objects.filter(
                assignment=self.assignment,
                is_individual=False,
            ).count(),
            2,
        )

    def test_grade_team_skips_members_without_approved_enrollment(self):
        """A removed student keeps out of team re-grading (ghost member)."""
        Enrollment.objects.filter(
            student=self.student2, section__course=self.course
        ).delete()

        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(
            Grade.objects.filter(
                assignment=self.assignment,
                student=self.student,
                score=Decimal("95.00"),
            ).exists()
        )
        self.assertFalse(
            Grade.objects.filter(
                assignment=self.assignment, student=self.student2
            ).exists()
        )

    def test_team_without_active_members_cannot_be_graded(self):
        Enrollment.objects.filter(section__course=self.course).delete()

        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)


class GradeStudentTests(GradingAPITestCase):
    def test_teacher_can_grade_a_student_individually(self):
        response = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.assertEqual(grade.score, Decimal("80.00"))
        self.assertTrue(grade.is_individual)
        self.assertEqual(grade.graded_by, self.teacher)

    def test_individual_grade_is_marked_as_individual(self):
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)

        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.assertTrue(grade.is_individual)

    def test_individual_grade_is_not_overwritten_by_team_regrade(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        individual = Grade.objects.get(
            assignment=self.assignment, student=self.student
        )
        group_member = Grade.objects.get(
            assignment=self.assignment, student=self.student2
        )
        self.assertEqual(individual.score, Decimal("80.00"))
        self.assertTrue(individual.is_individual)
        self.assertEqual(group_member.score, Decimal("100.00"))
        self.assertFalse(group_member.is_individual)

    def test_team_grade_can_overwrite_individual_grades_when_requested(self):
        """The teacher can force the team score over individual grades."""
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)

        self.authenticate(self.teacher)
        response = self.client.post(
            reverse(
                "assignment-grade-team",
                kwargs={"assignment_id": self.assignment.id},
            ),
            {
                "team": self.team.id,
                "score": "70.00",
                "overwrite_individual": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for student in (self.student, self.student2):
            grade = Grade.objects.get(
                assignment=self.assignment, student=student
            )
            self.assertEqual(grade.score, Decimal("70.00"))
            self.assertFalse(grade.is_individual)

    def test_team_grades_update_when_team_is_regraded(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        for student in (self.student, self.student2):
            grade = Grade.objects.get(assignment=self.assignment, student=student)
            self.assertEqual(grade.score, Decimal("100.00"))
            self.assertFalse(grade.is_individual)

    def test_individual_grade_creates_event_log(self):
        response = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        log = EventLog.objects.filter(
            action=EventLog.ACTION_UPDATE, entity_type="grade"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.teacher)
        self.assertEqual(log.target, self.student)
        self.assertEqual(log.entity_id, grade.id)
        self.assertEqual(log.metadata["assignment_id"], self.assignment.id)
        self.assertEqual(log.metadata["score"], "80.00")
        self.assertTrue(log.metadata["is_individual"])

    def test_team_grade_creates_event_log(self):
        response = self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log = EventLog.objects.filter(
            action=EventLog.ACTION_UPDATE, entity_type="grade"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.teacher)
        self.assertEqual(log.target, self.team.leader)
        self.assertEqual(log.metadata["assignment_id"], self.assignment.id)
        self.assertEqual(log.metadata["score"], "95.00")
        self.assertEqual(log.metadata["affected"], 2)
        self.assertEqual(log.metadata["team_id"], self.team.id)
        self.assertEqual(log.metadata["team_name"], self.team.name)
        self.assertEqual(
            set(log.metadata["member_ids"]),
            {self.student.id, self.student2.id},
        )


class GradeAccessTests(GradingAPITestCase):
    def test_student_cannot_create_grades(self):
        self.authenticate(self.student)

        team_response = self.grade_team(self.assignment, self.team, "95.00")
        student_response = self.grade_student(
            self.assignment, self.student, "80.00"
        )
        list_response = self.client.post(
            reverse("grade-list"), {}, format="json"
        )

        self.assertEqual(team_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(student_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(list_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(Grade.objects.count(), 0)

    def test_student_can_only_list_their_own_grades(self):
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)
        self.grade_student(self.assignment, self.student2, "70.00", self.teacher)

        self.authenticate(self.student)
        response = self.client.get(reverse("grade-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["student"]["id"], self.student.id)

    def test_student_cannot_retrieve_another_students_grade(self):
        self.grade_student(self.assignment, self.student2, "70.00", self.teacher)
        grade = Grade.objects.get(
            assignment=self.assignment, student=self.student2
        )

        self.authenticate(self.student)
        response = self.client.get(reverse("grade-detail", args=[grade.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_can_list_grades_of_own_courses_only(self):
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)
        self.grade_student(
            self.foreign_assignment, self.student, "60.00", self.other_teacher
        )

        self.authenticate(self.teacher)
        response = self.client.get(reverse("grade-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["assignment"]["course"]["id"],
            self.course.id,
        )

    def test_students_do_not_see_grade_origin_but_teachers_do(self):
        """``is_individual`` is teacher-only data."""
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)

        self.authenticate(self.student)
        student_response = self.client.get(reverse("grade-list"))

        self.assertEqual(student_response.status_code, status.HTTP_200_OK)
        self.assertGreater(student_response.data["count"], 0)
        for item in student_response.data["results"]:
            self.assertNotIn("is_individual", item)

        self.authenticate(self.teacher)
        teacher_response = self.client.get(reverse("grade-list"))

        self.assertEqual(teacher_response.status_code, status.HTTP_200_OK)
        for item in teacher_response.data["results"]:
            self.assertIn("is_individual", item)

    def test_student_loses_access_to_grades_after_enrollment_removal(self):
        """Grades are preserved but hidden from the removed student."""
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)

        Enrollment.objects.filter(
            student=self.student, section__course=self.course
        ).delete()

        self.authenticate(self.student)
        student_response = self.client.get(reverse("grade-list"))
        detail = Grade.objects.get(assignment=self.assignment, student=self.student)
        detail_response = self.client.get(
            reverse("grade-detail", args=[detail.id])
        )

        self.assertEqual(student_response.status_code, status.HTTP_200_OK)
        self.assertEqual(student_response.data["count"], 0)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

        # The teacher keeps the historical record of their course.
        self.authenticate(self.teacher)
        teacher_response = self.client.get(reverse("grade-list"))

        self.assertEqual(teacher_response.status_code, status.HTTP_200_OK)
        self.assertEqual(teacher_response.data["count"], 1)


class GradeValidationTests(GradingAPITestCase):
    def test_cannot_grade_student_not_belonging_to_course(self):
        response = self.grade_student(
            self.assignment, self.unapproved_student, "50.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_grade_a_team_belonging_to_another_course(self):
        response = self.grade_team(self.assignment, self.foreign_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_exceed_assignment_max_score(self):
        team_response = self.grade_team(self.assignment, self.team, "101.00", self.teacher)
        student_response = self.grade_student(
            self.assignment, self.student, "101.00", self.teacher
        )

        self.assertEqual(team_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(student_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_use_a_negative_score(self):
        response = self.grade_team(self.assignment, self.team, "-5.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_cannot_grade_a_team_without_members(self):
        empty_team = self.create_team("Empty Team", [self.unapproved_student])
        TeamMember.objects.filter(team=empty_team).delete()

        response = self.grade_team(self.assignment, empty_team, "95.00", self.teacher)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Grade.objects.count(), 0)

    def test_only_one_grade_per_assignment_and_student(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_team(self.assignment, self.team, "100.00", self.teacher)

        self.assertEqual(
            Grade.objects.filter(
                assignment=self.assignment, student=self.student
            ).count(),
            1,
        )
        grade = Grade.objects.get(
            assignment=self.assignment, student=self.student
        )
        self.assertEqual(grade.score, Decimal("100.00"))

        with self.assertRaises(IntegrityError):
            Grade.objects.create(
                assignment=self.assignment,
                student=self.student,
                score="90.00",
                graded_by=self.teacher,
            )

    def test_failed_grading_does_not_create_event_log(self):
        response = self.grade_student(
            self.assignment, self.unapproved_student, "50.00", self.teacher
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            EventLog.objects.filter(
                action=EventLog.ACTION_UPDATE, entity_type="grade"
            ).exists()
        )
        response = self.grade_team(
            self.assignment, self.foreign_team, "95.00", self.teacher
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            EventLog.objects.filter(
                action=EventLog.ACTION_UPDATE, entity_type="grade"
            ).exists()
        )


class GradeHistoryTests(GradingAPITestCase):
    """GradeHistory records every score change and is exposed read-only."""

    def history_url(self, grade_id):
        return reverse("grade-history", kwargs={"pk": grade_id})

    def test_team_grade_creates_history_with_first_record(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        for student in (self.student, self.student2):
            grade = Grade.objects.get(assignment=self.assignment, student=student)
            entry = grade.history.get()
            self.assertTrue(entry.first_record)
            self.assertIsNone(entry.old_score)
            self.assertEqual(entry.new_score, Decimal("95.00"))
            self.assertEqual(entry.graded_by, self.teacher)

    def test_regrade_records_old_and_new_score(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_team(self.assignment, self.team, "80.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        entries = list(grade.history.order_by("created_at"))
        self.assertEqual(len(entries), 2)
        self.assertTrue(entries[0].first_record)
        self.assertEqual(entries[1].old_score, Decimal("95.00"))
        self.assertEqual(entries[1].new_score, Decimal("80.00"))
        self.assertEqual(grade.score, Decimal("80.00"))

    def test_individual_grade_keeps_history_and_skips_team_regrades(self):
        self.grade_student(self.assignment, self.student, "70.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        first = grade.history.get()
        self.assertTrue(first.first_record)

        self.grade_team(self.assignment, self.team, "50.00", self.teacher)
        grade.refresh_from_db()
        self.assertEqual(grade.score, Decimal("70.00"))
        self.assertEqual(grade.history.count(), 1)
        other = Grade.objects.get(assignment=self.assignment, student=self.student2)
        self.assertEqual(other.score, Decimal("50.00"))
        self.assertEqual(other.history.count(), 1)

        self.grade_student(self.assignment, self.student, "60.00", self.teacher)
        entries = list(grade.history.order_by("created_at"))
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[1].old_score, Decimal("70.00"))
        self.assertEqual(entries[1].new_score, Decimal("60.00"))

    def test_teacher_reads_history(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.authenticate(self.teacher)
        response = self.client.get(self.history_url(grade.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        entry = response.data[0]
        self.assertEqual(entry["first_record"], True)
        self.assertIsNone(entry["old_score"])
        self.assertEqual(entry["new_score"], "95.00")
        self.assertEqual(entry["graded_by"]["username"], "teacher")
        self.assertIn("created_at", entry)

    def test_student_can_read_own_grade_history(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.authenticate(self.student)
        response = self.client.get(self.history_url(grade.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_other_student_cannot_read_foreign_history(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.authenticate(self.student2)
        response = self.client.get(self.history_url(grade.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_teacher_cannot_read_history(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        grade = Grade.objects.get(assignment=self.assignment, student=self.student)
        self.authenticate(self.other_teacher)
        response = self.client.get(self.history_url(grade.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SectionGradesExportTests(GradingAPITestCase):
    """GET /api/sections/{id}/export-grades/ (Excel workbook download)."""

    def setUp(self):
        super().setUp()
        self.section = self.get_section(self.course)
        self.ungraded_student = self.create_user("ungraded_student")
        self.enroll(self.ungraded_student, self.course)

    def export_url(self) -> str:
        return reverse(
            "section-export-grades", kwargs={"pk": self.section.id}
        )

    def export_csv_url(self) -> str:
        return reverse(
            "section-export-grades-csv", kwargs={"pk": self.section.id}
        )

    def test_teacher_downloads_workbook_with_expected_layout(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.student2, "80.00", self.teacher)
        Assignment.objects.create(
            course=self.course,
            title="Draft homework",
            max_score="50.00",
            is_published=False,
        )
        self.enroll(self.unapproved_student, self.course)
        Enrollment.objects.filter(student=self.unapproved_student).update(
            status=Status.PENDING
        )

        self.authenticate(self.teacher)
        response = self.client.get(self.export_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment", response["Content-Disposition"])

        workbook = load_workbook(BytesIO(response.content))
        sheet = workbook.active
        self.assertEqual(sheet["A1"].value, "Curso:")
        self.assertEqual(sheet["B1"].value, "Math 101")
        self.assertEqual(sheet["A2"].value, "Grupo:")
        self.assertEqual(sheet["B2"].value, "Default")
        self.assertEqual(
            [cell.value for cell in sheet[4]],
            ["Estudiante", "Homework 1", "Total", "Nota final"],
        )
        rows = {row[0].value: row for row in sheet.iter_rows(min_row=5)}
        student_row = rows[self.student.username]
        student2_row = rows[self.student2.username]
        self.assertEqual(student_row[1].value, 95.0)
        self.assertEqual(student_row[2].value, 95.0)
        self.assertEqual(student2_row[1].value, 80.0)
        self.assertEqual(student2_row[2].value, 80.0)
        self.assertNotIn(self.unapproved_student.username, rows)

    def test_total_sums_only_existing_grades(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.authenticate(self.teacher)
        response = self.client.get(self.export_url())

        workbook = load_workbook(BytesIO(response.content))
        sheet = workbook.active
        rows = {row[0].value: row for row in sheet.iter_rows(min_row=5)}
        ungraded_row = rows[self.ungraded_student.username]
        self.assertIsNone(ungraded_row[1].value)
        self.assertEqual(ungraded_row[2].value, 0)

    def test_other_teacher_cannot_export(self):
        self.authenticate(self.other_teacher)
        response = self.client.get(self.export_url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_export(self):
        self.authenticate(self.student)
        response = self.client.get(self.export_url())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_downloads_csv_with_expected_layout(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)
        self.grade_student(self.assignment, self.ungraded_student, "20.00", self.teacher)
        self.enroll(self.unapproved_student, self.course)
        Enrollment.objects.filter(student=self.unapproved_student).update(
            status=Status.PENDING
        )

        self.authenticate(self.teacher)
        response = self.client.get(self.export_csv_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"\xef\xbb\xbf"))

        text = response.content.decode("utf-8-sig")
        rows = list(csv.reader(StringIO(text)))
        self.assertEqual(rows[0], ["Curso:", "Math 101"])
        self.assertEqual(rows[1], ["Grupo:", "Default"])
        self.assertEqual(rows[3], ["Estudiante", "Homework 1", "Total", "Nota final"])
        by_student = {row[0]: row for row in rows[4:]}
        self.assertEqual(by_student[self.student.username][1], "95.0")
        self.assertEqual(by_student[self.student.username][2], "95.0")
        self.assertEqual(by_student[self.ungraded_student.username][1], "20.0")
        self.assertEqual(by_student[self.ungraded_student.username][2], "20.0")
        self.assertNotIn(self.unapproved_student.username, by_student)

    def test_csv_has_empty_cell_and_zero_total_for_ungraded_student(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.authenticate(self.teacher)
        response = self.client.get(self.export_csv_url())

        text = response.content.decode("utf-8-sig")
        rows = list(csv.reader(StringIO(text)))
        by_student = {row[0]: row for row in rows[4:]}
        ungraded_row = by_student[self.ungraded_student.username]
        self.assertEqual(ungraded_row[1], "")
        self.assertEqual(ungraded_row[2], "0.0")

    def test_csv_sanitizes_formula_like_titles(self):
        Assignment.objects.create(
            course=self.course,
            title="=SUM(A1:A9)",
            max_score="50.00",
            is_published=True,
        )

        self.authenticate(self.teacher)
        response = self.client.get(self.export_csv_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        text = response.content.decode("utf-8-sig")
        self.assertIn("'=SUM(A1:A9)", text)

    def test_other_teacher_cannot_export_csv(self):
        self.authenticate(self.other_teacher)
        response = self.client.get(self.export_csv_url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_export_csv(self):
        self.authenticate(self.student)
        response = self.client.get(self.export_csv_url())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class WeightedFinalGradeTests(GradingAPITestCase):
    """final_grade_for_student computes the weighted average of a course."""

    def test_single_assignment_maps_to_percentage(self):
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)
        final = final_grade_for_student(
            course=self.course, student=self.student
        )
        self.assertEqual(final, Decimal("80.00"))

    def test_weighted_average_across_assignments(self):
        second = Assignment.objects.create(
            course=self.course,
            title="Exam",
            max_score="100.00",
            weight="2.00",
            is_published=True,
        )
        self.grade_student(self.assignment, self.student, "100.00", self.teacher)
        self.grade_student(second, self.student, "50.00", self.teacher)
        final = final_grade_for_student(
            course=self.course, student=self.student
        )
        self.assertEqual(final, Decimal("66.67"))

    def test_ungraded_assignment_counts_as_zero(self):
        Assignment.objects.create(
            course=self.course,
            title="Homework 2",
            max_score="100.00",
            is_published=True,
        )
        self.grade_student(self.assignment, self.student, "100.00", self.teacher)
        final = final_grade_for_student(
            course=self.course, student=self.student
        )
        self.assertEqual(final, Decimal("50.00"))

    def test_draft_assignments_are_excluded(self):
        self.grade_student(self.assignment, self.student, "100.00", self.teacher)
        Assignment.objects.create(
            course=self.course,
            title="Draft",
            max_score="100.00",
            is_published=False,
        )
        final = final_grade_for_student(
            course=self.course, student=self.student
        )
        self.assertEqual(final, Decimal("100.00"))

    def test_no_published_assignments_yields_none(self):
        Assignment.objects.all().delete()
        self.assertIsNone(
            final_grade_for_student(course=self.course, student=self.student)
        )

    def test_grade_outside_the_course_is_ignored(self):
        self.grade_student(self.assignment, self.student, "100.00", self.teacher)
        # The final grade of the other course only reflects its own
        # assignments: the 100 in Math 101 must not leak into Physics.
        self.assertEqual(
            final_grade_for_student(course=self.other_course, student=self.student),
            Decimal("0.00"),
        )


class PonderatedGradeTests(GradingAPITestCase):
    """The ponderación scheme splits the final grade per (category, parcial)."""

    def _configure(self, p1_acum="30.00", p1_exam="20.00", p2_acum="30.00", p2_exam="20.00"):
        settings, _ = CourseSettings.objects.get_or_create(course=self.course)
        settings.ponderacion_enabled = True
        settings.p1_acumulado_pct = Decimal(p1_acum)
        settings.p1_examen_pct = Decimal(p1_exam)
        settings.p2_acumulado_pct = Decimal(p2_acum)
        settings.p2_examen_pct = Decimal(p2_exam)
        settings.save()
        return settings

    def _assignment(self, *, category, parcial, score, weight="1.00", max_score="100.00"):
        assignment = Assignment.objects.create(
            course=self.course,
            title=f"{category} {parcial}",
            max_score=max_score,
            weight=weight,
            is_published=True,
            category=category,
            parcial=parcial,
        )
        self.grade_student(assignment, self.student, score, self.teacher)
        return assignment

    def test_disabled_uses_plain_weighted_average(self):
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("80.00"))

    def test_weighted_avg_across_parcial_buckets(self):
        self.assignment.delete()
        self._configure(p1_acum="30.00", p1_exam="20.00", p2_acum="30.00", p2_exam="20.00")
        self._assignment(category="ACUMULADO", parcial="PRIMERO", score="80.00")
        self._assignment(category="ACUMULADO", parcial="SEGUNDO", score="90.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="80.00")
        self._assignment(category="EXAMEN", parcial="SEGUNDO", score="60.00")
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("79.00"))

    def test_exams_are_averaged_not_weighted(self):
        self.assignment.delete()
        self._configure(p1_acum="10.00", p1_exam="40.00", p2_acum="30.00", p2_exam="20.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="80.00", weight="5.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="90.00", weight="5.00")
        self._assignment(category="ACUMULADO", parcial="PRIMERO", score="100.00")
        self._assignment(category="ACUMULADO", parcial="SEGUNDO", score="100.00")
        self._assignment(category="EXAMEN", parcial="SEGUNDO", score="50.00")
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("84.00"))

    def test_ungraded_exam_counts_as_zero_in_bucket(self):
        self.assignment.delete()
        self._configure(p1_acum="30.00", p1_exam="40.00", p2_acum="30.00", p2_exam="0.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="80.00")
        Assignment.objects.create(
            course=self.course,
            title="Exam 2 ungraded",
            max_score="100.00",
            is_published=True,
            category="EXAMEN",
            parcial="PRIMERO",
        )
        self._assignment(category="ACUMULADO", parcial="PRIMERO", score="100.00")
        self._assignment(category="ACUMULADO", parcial="SEGUNDO", score="100.00")
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("76.00"))

    def test_bucket_without_published_assignments_is_skipped(self):
        self.assignment.delete()
        self._configure()
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="80.00")
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("16.00"))

    def test_no_published_assignments_yields_none(self):
        self.assignment.delete()
        self._configure()
        self.assertIsNone(
            final_grade_for_student(course=self.course, student=self.student)
        )

    def test_user_example_split(self):
        self.assignment.delete()
        self._configure(p1_acum="15.00", p1_exam="35.00", p2_acum="35.00", p2_exam="15.00")
        self._assignment(category="ACUMULADO", parcial="PRIMERO", score="80.00")
        self._assignment(category="ACUMULADO", parcial="SEGUNDO", score="90.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="85.00")
        final = final_grade_for_student(course=self.course, student=self.student)
        self.assertEqual(final, Decimal("73.25"))

    def test_breakdown_returns_per_bucket_components(self):
        self.assignment.delete()
        self._configure(p1_acum="15.00", p1_exam="35.00", p2_acum="35.00", p2_exam="15.00")
        self._assignment(category="ACUMULADO", parcial="PRIMERO", score="80.00")
        self._assignment(category="ACUMULADO", parcial="SEGUNDO", score="90.00")
        self._assignment(category="EXAMEN", parcial="PRIMERO", score="85.00")
        components = ponderated_breakdown_for_student(
            course=self.course, student=self.student
        )
        by_bucket = {(c["type"], c["parcial"]): c for c in components}
        self.assertEqual(len(components), 3)
        self.assertEqual(by_bucket[("ACUMULADO", "PRIMERO")]["pct"], "15.00")
        self.assertEqual(by_bucket[("ACUMULADO", "PRIMERO")]["average"], "80.00")
        self.assertEqual(by_bucket[("ACUMULADO", "PRIMERO")]["assignments"], 1)
        self.assertEqual(by_bucket[("EXAMEN", "PRIMERO")]["average"], "85.00")
        self.assertEqual(by_bucket[("ACUMULADO", "SEGUNDO")]["average"], "90.00")

    def test_breakdown_is_empty_when_no_assignments(self):
        self.assignment.delete()
        self._configure()
        components = ponderated_breakdown_for_student(
            course=self.course, student=self.student
        )
        self.assertEqual(components, [])


class SuperuserIsolationTests(GradingAPITestCase):
    """The superuser has no special powers in the regular grading views."""

    def setUp(self):
        super().setUp()
        self.superuser = self.create_user("root")
        self.superuser.is_superuser = True
        self.superuser.save()

    def test_superuser_sees_no_grades(self):
        Grade.objects.create(
            assignment=self.assignment,
            student=self.student,
            score=Decimal("95.00"),
            graded_by=self.teacher,
        )
        self.authenticate(self.superuser)

        response = self.client.get("/api/grades/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_superuser_cannot_grade_foreign_assignment(self):
        response = self.grade_student(
            self.foreign_assignment,
            self.student2,
            "50.00",
            self.superuser,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_cannot_grade_team_of_foreign_course(self):
        response = self.grade_team(
            self.foreign_assignment,
            self.foreign_team,
            "50.00",
            self.superuser,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ArchivedCourseGradingTests(GradingAPITestCase):
    """Archiving a course locks its grading, and restoring re-opens it."""

    def test_teacher_cannot_grade_student_in_archived_course(self):
        self.course.is_active = False
        self.course.save()

        response = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_grade_team_in_archived_course(self):
        self.course.is_active = False
        self.course.save()

        response = self.grade_team(
            self.assignment, self.team, "80.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_restored_course_can_be_graded_again(self):
        self.course.is_active = False
        self.course.save()
        blocked = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)

        self.course.is_active = True
        self.course.save()
        response = self.grade_student(
            self.assignment, self.student, "80.00", self.teacher
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Grade.objects.filter(
                assignment=self.assignment, student=self.student
            ).count(),
            1,
        )


class ConcurrentGradingTests(TransactionTestCase):
    """Two simultaneous individual grades for the same student must converge
    on a single grade row (never a duplicate or an HTTP 500)."""

    def setUp(self):
        self.teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        self.teacher = User.objects.create_user(username="race_teacher")
        self.teacher.groups.add(self.teacher_group)

        self.student = User.objects.create_user(username="race_student")

        self.course = Course.objects.create(title="Race", teacher=self.teacher)
        self.section, _ = Section.objects.get_or_create(
            course=self.course, name="S1"
        )
        Enrollment.objects.create(
            section=self.section,
            student=self.student,
            status=Status.APPROVED,
        )
        self.assignment = Assignment.objects.create(
            course=self.course,
            title="Homework",
            max_score="100.00",
            is_published=True,
        )

    def _grade(self, results, barrier):
        client = APIClient()
        client.force_authenticate(user=self.teacher)
        try:
            barrier.wait()
            response = client.post(
                reverse(
                    "assignment-grade-student",
                    kwargs={"assignment_id": self.assignment.id},
                ),
                {"student": self.student.id, "score": "80.00"},
                format="json",
            )
            results.append(response.status_code)
        finally:
            connections.close_all()

    @unittest.skipUnless(
        connections["default"].vendor == "postgresql",
        "Requires row-level locking (SELECT ... FOR UPDATE); on SQLite "
        "concurrent writers hit 'database is locked' instead of serializing.",
    )
    def test_concurrent_individual_grades_create_single_grade(self):
        results = []
        barrier = threading.Barrier(2)
        threads = [
            threading.Thread(target=self._grade, args=(results, barrier))
            for _ in range(2)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(set(results), {status.HTTP_200_OK})
        count = Grade.objects.filter(
            assignment=self.assignment, student=self.student
        ).count()
        self.assertEqual(count, 1)


class FinalScoreSnapshotTests(GradingAPITestCase):
    """Evolution points are captured on grading and served to the right user.

    A point is stored after every grading mutation, but only when the course
    has a defined final grade (at least one published assignment).
    """

    def test_grade_student_records_a_final_score_snapshot(self):
        self.grade_student(self.assignment, self.student, "80.00", self.teacher)

        snapshot = FinalScoreSnapshot.objects.filter(
            course=self.course,
            student=self.student,
        ).first()
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot.score, Decimal("80.00"))

    def test_grade_team_records_a_snapshot_per_approved_member(self):
        self.grade_team(self.assignment, self.team, "95.00", self.teacher)

        self.assertEqual(
            FinalScoreSnapshot.objects.filter(course=self.course).count(),
            2,
        )
        self.assertTrue(
            FinalScoreSnapshot.objects.filter(
                course=self.course,
                student=self.student,
                score=Decimal("95.00"),
            ).exists()
        )

    def test_unpublished_assignments_do_not_produce_snapshots(self):
        draft_course = Course.objects.create(
            title="Drafting", teacher=self.teacher
        )
        self.enroll(self.student, draft_course)
        draft = Assignment.objects.create(
            course=draft_course,
            title="Draft",
            max_score="100.00",
            is_published=False,
        )
        self.grade_student(draft, self.student, "50.00", self.teacher)

        self.assertFalse(
            FinalScoreSnapshot.objects.filter(course=draft_course).exists()
        )

    def test_re_grading_appends_a_new_point_without_removing_old_ones(self):
        self.grade_student(self.assignment, self.student, "60.00", self.teacher)
        self.grade_student(self.assignment, self.student, "90.00", self.teacher)

        points = list(
            FinalScoreSnapshot.objects.filter(
                course=self.course,
                student=self.student,
            ).order_by("created_at")
        )
        self.assertEqual(len(points), 2)
        self.assertEqual([p.score for p in points], [Decimal("60.00"), Decimal("90.00")])

    def test_student_sees_own_evolution_series(self):
        self.grade_student(self.assignment, self.student, "70.00", self.teacher)
        self.authenticate(self.student)

        response = self.client.get(
            reverse("grade-evolution"), {"course": self.course.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["course"]["id"], self.course.id)
        self.assertEqual(response.data["student"]["id"], self.student.id)
        self.assertEqual(len(response.data["points"]), 1)
        self.assertEqual(response.data["points"][0]["score"], "70.00")

    def test_teacher_sees_evolution_of_own_courses_only(self):
        self.enroll(self.student2, self.other_course)
        self.grade_student(self.assignment, self.student, "70.00", self.teacher)
        self.grade_student(self.foreign_assignment, self.student2, "80.00", self.other_teacher)
        self.authenticate(self.teacher)

        response = self.client.get(reverse("grade-evolution"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["course"]["id"], self.course.id)
        self.assertEqual(len(response.data["points"]), 1)
        self.assertEqual(response.data["points"][0]["score"], "70.00")

    def test_other_student_does_not_see_another_student_evolution(self):
        self.grade_student(self.assignment, self.student, "70.00", self.teacher)
        self.authenticate(self.student2)

        response = self.client.get(
            reverse("grade-evolution"), {"course": self.course.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["points"], [])
        self.assertIsNone(response.data["course"])

    def test_evolution_requires_authentication(self):
        response = self.client.get(reverse("grade-evolution"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
