"""Excel and CSV export of section grades.

Builds an ``.xlsx`` workbook or a UTF-8 ``.csv`` in memory with this layout:

    Curso:  <course title>
    Grupo:  <section name>
    ----------------------------------------------
    Estudiante | Assignment 1 | Assignment 2 | Total | Nota final
    ...        | ...          | ...          | ...   | ...

Only published assignments and approved enrollments are included; missing
grades render as empty cells and ``Total`` sums the existing ones. ``Nota
final`` is the computed final grade (average over available points, or the
configured ponderación scheme when the course has it enabled).
"""

import csv
import io

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from assignments.models import Assignment
from course.models import Enrollment, Status
from grading.final import final_grade_for_student, ponderated_parcial_scores_for_student
from grading.models import Grade

HEADER_ROW = 4

# Caracteres que Excel/CSV interpretan como inicio de formula. Prefijar con "'"
# neutraliza el valor y evita la inyeccion de formulas al abrir el archivo.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _sanitize(value) -> str:
    text = str(value)
    if text.startswith(_FORMULA_PREFIXES):
        return "'" + text
    return text


def _student_label(enrollment) -> str:
    student = enrollment.student
    return _sanitize(
        f"{student.first_name or student.username} {student.last_name or ''}".strip()
    )


def _section_grades_data(*, section):
    """Return the shared data behind every export format.

    Returns ``(assignments, enrollments, scores_by_pair)`` where
    ``scores_by_pair`` maps ``(student_id, assignment_id)`` to the score.
    """
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
        .order_by("student__first_name", "student__last_name", "student__username")
    )

    enrollment_ids = [enrollment.student_id for enrollment in enrollments]
    assignment_ids = [assignment.id for assignment in assignments]
    scores_by_pair = {}
    if enrollment_ids and assignment_ids:
        for grade in Grade.objects.filter(
            assignment_id__in=assignment_ids,
            student_id__in=enrollment_ids,
        ).only("student_id", "assignment_id", "score"):
            scores_by_pair[(grade.student_id, grade.assignment_id)] = float(
                grade.score
            )

    return assignments, enrollments, scores_by_pair


def build_section_grades_workbook(*, section) -> bytes:
    """Return the grades of ``section`` as an ``.xlsx`` byte string."""
    assignments, enrollments, scores_by_pair = _section_grades_data(
        section=section
    )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Notas"
    bold = Font(bold=True)

    sheet["A1"] = "Curso:"
    sheet["B1"] = _sanitize(section.course.title)
    sheet["A2"] = "Grupo:"
    sheet["B2"] = _sanitize(section.name)
    sheet["A1"].font = bold
    sheet["A2"].font = bold

    headers = [
        "Estudiante",
        *[_sanitize(a.title) for a in assignments],
        "Total",
        "Nota final",
    ]
    for column_index, header in enumerate(headers, start=1):
        sheet.cell(row=HEADER_ROW, column=column_index, value=header).font = bold

    settings = getattr(section.course, "settings", None)
    ponderacion_enabled = (
        settings is not None and settings.ponderacion_enabled
    )

    total_column = len(assignments) + 2
    if ponderacion_enabled:
        parcial1_column = total_column + 1
        parcial2_column = total_column + 2
        final_column = parcial2_column + 1
    else:
        final_column = total_column + 1

    headers = [
        "Estudiante",
        *[_sanitize(a.title) for a in assignments],
        "Total",
    ]
    if ponderacion_enabled:
        headers.extend(["Parcial 1", "Parcial 2"])
    headers.append("Nota final")

    for column_index, header in enumerate(headers, start=1):
        sheet.cell(row=HEADER_ROW, column=column_index, value=header).font = bold

    for offset, enrollment in enumerate(enrollments, start=1):
        row = HEADER_ROW + offset
        sheet.cell(row=row, column=1, value=_student_label(enrollment))
        total = 0.0
        for assignment_offset, assignment in enumerate(assignments, start=2):
            score = scores_by_pair.get((enrollment.student_id, assignment.id))
            if score is None:
                continue
            sheet.cell(row=row, column=assignment_offset, value=round(score, 2))
            total += score
        sheet.cell(row=row, column=total_column, value=round(total, 2))

        final_score = final_grade_for_student(
            course=section.course,
            student=enrollment.student,
        )

        if ponderacion_enabled:
            parcial_scores = ponderated_parcial_scores_for_student(
                course=section.course,
                student=enrollment.student,
            )
            for parcial_column, parcial_key in [
                (parcial1_column, "PRIMERO"),
                (parcial2_column, "SEGUNDO"),
            ]:
                value = parcial_scores.get(parcial_key)
                if value is not None:
                    sheet.cell(
                        row=row,
                        column=parcial_column,
                        value=round(float(value), 2),
                    )

        if final_score is not None:
            sheet.cell(row=row, column=final_column, value=round(float(final_score), 2))

    sheet.column_dimensions["A"].width = 28
    for column_index in range(2, final_column + 1):
        sheet.column_dimensions[get_column_letter(column_index)].width = 16

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def build_section_grades_csv(*, section) -> bytes:
    """Return the grades of ``section`` as UTF-8 CSV (with BOM).

    The BOM makes Excel detect the UTF-8 encoding on Windows so accented
    characters render correctly.
    """
    assignments, enrollments, scores_by_pair = _section_grades_data(
        section=section
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Curso:", _sanitize(section.course.title)])
    writer.writerow(["Grupo:", _sanitize(section.name)])
    writer.writerow([])
    settings = getattr(section.course, "settings", None)
    ponderacion_enabled = (
        settings is not None and settings.ponderacion_enabled
    )

    header_row = ["Estudiante", *[_sanitize(a.title) for a in assignments], "Total"]
    if ponderacion_enabled:
        header_row.extend(["Parcial 1", "Parcial 2"])
    header_row.append("Nota final")

    writer.writerow(header_row)

    for enrollment in enrollments:
        row = [_student_label(enrollment)]
        total = 0.0
        for assignment in assignments:
            score = scores_by_pair.get((enrollment.student_id, assignment.id))
            row.append(round(score, 2) if score is not None else "")
            if score is not None:
                total += score
        row.append(round(total, 2))

        final_score = final_grade_for_student(
            course=section.course,
            student=enrollment.student,
        )

        if ponderacion_enabled:
            parcial_scores = ponderated_parcial_scores_for_student(
                course=section.course,
                student=enrollment.student,
            )
            for parcial_key in ["PRIMERO", "SEGUNDO"]:
                value = parcial_scores.get(parcial_key)
                row.append(round(float(value), 2) if value is not None else "")

        row.append(round(float(final_score), 2) if final_score is not None else "")
        writer.writerow(row)

    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


# ── Snapshot imports (read from a frozen SectionSnapshot payload) ─────


def _snapshot_grades_data(payload) -> tuple:
    """Return the export data from a snapshot payload instead of the DB.

    Mirrors ``_section_grades_data``: only published assignments and
    approved enrollments are included, so the exported report matches the
    one the teacher could download while the section was alive.
    """
    assignments = [
        assignment
        for assignment in payload["assignments"]
        if assignment["is_published"]
    ]
    enrollments = [
        enrollment
        for enrollment in payload["enrollments"]
        if enrollment["status"] == Status.APPROVED
    ]
    scores_by_pair = {
        (grade["student_id"], grade["assignment_id"]): float(grade["score"])
        for grade in payload["grades"]
    }
    return assignments, enrollments, scores_by_pair


def _snapshot_student_label(enrollment) -> str:
    return _sanitize(
        f"{enrollment['first_name'] or enrollment['username']} "
        f"{enrollment['last_name'] or ''}".strip()
    )


def build_section_snapshot_workbook(payload) -> bytes:
    """Return the frozen grades of a snapshot as an ``.xlsx`` byte string."""
    assignments, enrollments, scores_by_pair = _snapshot_grades_data(payload)
    final_by_student = {
        entry["student_id"]: entry["score"]
        for entry in payload.get("final_grades", [])
    }

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Notas"
    bold = Font(bold=True)

    sheet["A1"] = "Curso:"
    sheet["B1"] = _sanitize(payload["course"]["title"])
    sheet["A2"] = "Grupo:"
    sheet["B2"] = _sanitize(payload["section"]["name"])
    sheet["A1"].font = bold
    sheet["A2"].font = bold

    headers = [
        "Estudiante",
        *[_sanitize(a["title"]) for a in assignments],
        "Total",
        "Nota final",
    ]
    for column_index, header in enumerate(headers, start=1):
        sheet.cell(row=HEADER_ROW, column=column_index, value=header).font = bold

    total_column = len(assignments) + 2
    final_column = total_column + 1
    for offset, enrollment in enumerate(enrollments, start=1):
        row = HEADER_ROW + offset
        sheet.cell(row=row, column=1, value=_snapshot_student_label(enrollment))
        total = 0.0
        for assignment_offset, assignment in enumerate(assignments, start=2):
            score = scores_by_pair.get(
                (enrollment["student_id"], assignment["id"])
            )
            if score is None:
                continue
            sheet.cell(row=row, column=assignment_offset, value=round(score, 2))
            total += score
        sheet.cell(row=row, column=total_column, value=round(total, 2))
        final_score = final_by_student.get(enrollment["student_id"])
        if final_score is not None:
            sheet.cell(row=row, column=final_column, value=round(float(final_score), 2))

    sheet.column_dimensions["A"].width = 28
    for column_index in range(2, final_column + 1):
        sheet.column_dimensions[get_column_letter(column_index)].width = 16

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def build_section_snapshot_csv(payload) -> bytes:
    """Return the frozen grades of a snapshot as UTF-8 CSV (with BOM)."""
    assignments, enrollments, scores_by_pair = _snapshot_grades_data(payload)
    final_by_student = {
        entry["student_id"]: entry["score"]
        for entry in payload.get("final_grades", [])
    }

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Curso:", _sanitize(payload["course"]["title"])])
    writer.writerow(["Grupo:", _sanitize(payload["section"]["name"])])
    writer.writerow([])
    writer.writerow(
        ["Estudiante", *[_sanitize(a["title"]) for a in assignments], "Total", "Nota final"]
    )

    for enrollment in enrollments:
        row = [_snapshot_student_label(enrollment)]
        total = 0.0
        for assignment in assignments:
            score = scores_by_pair.get(
                (enrollment["student_id"], assignment["id"])
            )
            row.append(round(score, 2) if score is not None else "")
            if score is not None:
                total += score
        row.append(round(total, 2))
        final_score = final_by_student.get(enrollment["student_id"])
        row.append(round(float(final_score), 2) if final_score is not None else "")
        writer.writerow(row)

    return ("\ufeff" + buffer.getvalue()).encode("utf-8")
