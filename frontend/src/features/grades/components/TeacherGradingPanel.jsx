import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAllAssignments } from "@/features/assignments/hooks/useAllAssignments";
import { getEnrollments } from "@/features/courses/services/courseService";
import { useAllData } from "@/features/courses/hooks/useAllData";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { useAssignmentGrades } from "@/features/grades/hooks/useAssignmentGrades";
import {
    gradeStudent,
    gradeTeam,
} from "@/features/grades/services/gradeService";
import { getTeams } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DOT_COLORS = [
    "bg-red-500",
    "bg-orange-400",
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-yellow-400",
    "bg-teal-500",
    "bg-pink-500",
];

const studentName = (student) =>
    `${student.first_name || student.username} ${student.last_name ?? ""}`
        .trim()
        .replace(/\s+/g, " ");

const studentInitials = (student) => {
    const first = (student.first_name || student.username || "?").trim();
    const last = (student.last_name ?? "").trim();
    return `${first[0] ?? "?"}${last[0] ?? ""}`.toUpperCase();
};

const formatScore = (score) =>
    score === null || score === undefined ? "__" : String(score);

const teamDraftKey = (teamId) => `t:${teamId}`;
const memberDraftKey = (teamId, studentId) => `m:${teamId}:${studentId}`;
const unteamedDraftKey = (studentId) => `u:${studentId}`;

export const TeacherGradingPanel = () => {
    const { assignments, loading: assignmentsLoading } = useAllAssignments();
    const { courses } = useCourses();
    const [courseFilter, setCourseFilter] = useState("");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamNameQuery, setTeamNameQuery] = useState("");
    const [drafts, setDrafts] = useState({});
    const [savingKey, setSavingKey] = useState(null);

    const selectedAssignment = assignments.find(
        (item) => String(item.id) === String(selectedAssignmentId)
    );
    const courseId = selectedAssignment?.course?.id ?? null;

    const filteredAssignments = courseFilter
        ? assignments.filter(
              (assignment) =>
                  String(assignment.course.id) === String(courseFilter)
          )
        : assignments;

    const { data: rawTeams, loading: teamsLoading } = useAllData(
        useCallback(
            (params) =>
                courseId
                    ? getTeams({ course: courseId, ...params })
                    : Promise.resolve([]),
            [courseId]
        )
    );

    const { data: rawEnrollments } = useAllData(
        useCallback(
            (params) =>
                courseId
                    ? getEnrollments(courseId, params)
                    : Promise.resolve([]),
            [courseId]
        )
    );

    const teams = rawTeams ?? [];
    const enrollments = rawEnrollments ?? [];

    const students = enrollments.filter(
        (enrollment) => enrollment.status === "APPROVED"
    );

    const teamedIds = new Set(
        teams.flatMap((team) =>
            (team.members ?? []).map((member) => String(member.student?.id))
        )
    );
    const unteamedStudents = students.filter(
        (enrollment) => !teamedIds.has(String(enrollment.student.id))
    );

    const { grades, loading: gradesLoading, reload: reloadGrades } =
        useAssignmentGrades(selectedAssignmentId);

    const gradesByStudentId = useMemo(
        () =>
            new Map(
                (grades ?? []).map((grade) => [String(grade.student.id), grade])
            ),
        [grades]
    );

    const maxScore = selectedAssignment?.max_score ?? 10;

    const getTeamGrade = useCallback(
        (team) => {
            for (const member of team.members ?? []) {
                const grade = gradesByStudentId.get(
                    String(member.student?.id)
                );
                if (grade && !grade.is_individual) {
                    return Number(grade.score);
                }
            }
            return null;
        },
        [gradesByStudentId]
    );

    const getEffectiveScore = useCallback(
        (studentId, fallbackTeamGrade) => {
            const grade = gradesByStudentId.get(String(studentId));
            if (!grade) {
                return null;
            }
            return grade.is_individual
                ? Number(grade.score)
                : fallbackTeamGrade ?? Number(grade.score);
        },
        [gradesByStudentId]
    );

    const isIndividual = useCallback(
        (studentId) =>
            Boolean(gradesByStudentId.get(String(studentId))?.is_individual),
        [gradesByStudentId]
    );

    const inputValue = (key, fallback) => {
        const draft = drafts[key];
        if (draft !== undefined) {
            return draft;
        }
        return fallback === null || fallback === undefined
            ? ""
            : String(fallback);
    };

    const setDraft = (key, value) =>
        setDrafts((prev) => ({ ...prev, [key]: value }));

    const clearDraft = (key) =>
        setDrafts((prev) => {
            if (!(key in prev)) {
                return prev;
            }
            const next = { ...prev };
            delete next[key];
            return next;
        });

    const handleSelectCourse = (e) => {
        setCourseFilter(e.target.value);
        setSelectedAssignmentId("");
        setSelectedTeamId(null);
        setDrafts({});
    };

    const handleSelectAssignment = (e) => {
        setSelectedAssignmentId(e.target.value);
        setSelectedTeamId(null);
        setDrafts({});
    };

    const handleSelectTeam = (teamId) =>
        setSelectedTeamId((current) =>
            String(current) === String(teamId) ? null : teamId
        );

    const handleSaveTeamNote = async (team) => {
        const key = teamDraftKey(team.id);
        const raw = drafts[key];
        if (!selectedAssignmentId || !team?.id || !raw) {
            return;
        }
        setSavingKey(key);
        try {
            await gradeTeam(selectedAssignmentId, team.id, raw);
            toast.success(`Nota aplicada al ${team.name}`);
            clearDraft(key);
            await reloadGrades();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveMember = async (teamId, studentId) => {
        const key =
            teamId === null
                ? unteamedDraftKey(studentId)
                : memberDraftKey(teamId, studentId);
        const raw = drafts[key];
        if (!selectedAssignmentId || !studentId || !raw) {
            return;
        }
        setSavingKey(key);
        try {
            await gradeStudent(selectedAssignmentId, studentId, raw);
            toast.success("Nota individual guardada");
            clearDraft(key);
            await reloadGrades();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingKey(null);
        }
    };

    const visibleTeams = teams.filter((team) =>
        team.name.toLowerCase().includes(teamNameQuery.trim().toLowerCase())
    );

    const selectedTeam = teams.find(
        (team) => String(team.id) === String(selectedTeamId)
    ) ?? null;

    if (assignmentsLoading) {
        return <p className="text-gray-500">Cargando asignaciones...</p>;
    }

    if (assignments.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                No tienes asignaciones para calificar.
            </p>
        );
    }

    const renderMemberRow = (teamId, student) => {
        const key =
            teamId === null
                ? unteamedDraftKey(student.id)
                : memberDraftKey(teamId, student.id);
        const fallback = getEffectiveScore(student.id, null);
        const individual = isIndividual(student.id);

        return (
            <li
                key={key}
                className="py-2.5 flex items-center justify-between gap-3"
            >
                <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-semibold shrink-0">
                        {studentInitials(student)}
                    </span>
                    <span className="text-sm text-gray-800 truncate">
                        {studentName(student)}
                    </span>
                    {individual && (
                        <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold shrink-0">
                            individual
                        </span>
                    )}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxScore}
                        value={inputValue(key, fallback)}
                        onChange={(e) => setDraft(key, e.target.value)}
                        className="w-16 px-2 py-1.5 rounded-lg border outline-none transition text-right text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="__"
                    />
                    <span className="text-xs text-gray-400">/ {maxScore}</span>
                    <button
                        type="button"
                        onClick={() =>
                            handleSaveMember(teamId, student.id)
                        }
                        disabled={
                            savingKey === key ||
                            !inputValue(key, fallback)
                        }
                        title="Guardar nota individual"
                        className="px-2 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                    >
                        {savingKey === key ? "…" : "✓"}
                    </button>
                </span>
            </li>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-4">
                <div className="min-w-[180px] flex-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Curso
                    </label>
                    <select
                        value={courseFilter}
                        onChange={handleSelectCourse}
                        className="w-full px-4 py-2.5 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Todos los cursos</option>
                        {(courses ?? []).map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="min-w-[220px] flex-[2]">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Asignación
                    </label>
                    {filteredAssignments.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2.5">
                            Este curso no tiene asignaciones.
                        </p>
                    ) : (
                        <select
                            value={selectedAssignmentId}
                            onChange={handleSelectAssignment}
                            className="w-full px-4 py-2.5 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">
                                Selecciona una asignación...
                            </option>
                            {(filteredAssignments ?? []).map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {assignment.course.title} —{" "}
                                    {assignment.title}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {selectedAssignment && (
                    <span className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-sm font-semibold text-indigo-700 shrink-0">
                        {maxScore} puntos
                    </span>
                )}
            </div>

            {selectedAssignmentId && (
                <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
                    <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <span aria-hidden>👥</span> Todos los equipos
                            </h2>
                            <span className="text-xs text-gray-400">
                                {visibleTeams.length}
                            </span>
                        </div>

                        <input
                            type="search"
                            value={teamNameQuery}
                            onChange={(e) => setTeamNameQuery(e.target.value)}
                            placeholder="Filtrar por nombre..."
                            className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />

                        {teamsLoading ? (
                            <p className="text-sm text-gray-500">
                                Cargando equipos...
                            </p>
                        ) : teams.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Este curso no tiene equipos.
                            </p>
                        ) : visibleTeams.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Ningún equipo coincide con el filtro.
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100 -mx-2">
                                {visibleTeams.map((team, index) => {
                                    const isSelected =
                                        String(selectedTeamId) ===
                                        String(team.id);
                                    const members = team.members ?? [];
                                    const teamGrade = getTeamGrade(team);

                                    return (
                                        <li key={team.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSelectTeam(team.id)
                                                }
                                                className={`w-full flex items-center gap-2.5 px-2 py-3 text-left transition rounded-lg ${
                                                    isSelected
                                                        ? "bg-indigo-50 ring-1 ring-indigo-200"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        DOT_COLORS[
                                                            index %
                                                                DOT_COLORS.length
                                                        ]
                                                    }`}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-gray-800 truncate">
                                                        {team.name}
                                                    </span>
                                                    <span className="block text-xs text-gray-400 mt-0.5">
                                                        └ {members.length}{" "}
                                                        integrante
                                                        {members.length === 1
                                                            ? ""
                                                            : "s"}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`text-sm font-bold shrink-0 ${
                                                        isSelected
                                                            ? "text-indigo-700"
                                                            : "text-gray-700"
                                                    }`}
                                                >
                                                    {formatScore(teamGrade)}
                                                    <span className="text-gray-400 font-normal">
                                                        /{maxScore}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </aside>

                    <section className="space-y-6 min-w-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                                Información de la asignación
                            </h2>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {selectedAssignment.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                                {selectedAssignment.description ||
                                    selectedAssignment.course.description ||
                                    "Esta asignación no tiene descripción."}
                            </p>
                        </div>

                        {gradesLoading ? (
                            <p className="text-sm text-gray-500">
                                Cargando calificaciones...
                            </p>
                        ) : selectedTeam ? (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
                                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-indigo-50/60 border-b border-indigo-100">
                                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                        {selectedTeam.name}
                                    </h3>
                                    <span className="text-sm font-bold text-indigo-700">
                                        {formatScore(getTeamGrade(selectedTeam))}
                                        <span className="text-gray-400 font-normal">
                                            {" "}
                                            / {maxScore}
                                        </span>
                                    </span>
                                </div>

                                <div className="px-6 py-4">
                                    {(selectedTeam.members ?? []).length ===
                                    0 ? (
                                        <p className="text-sm text-gray-500">
                                            Este equipo no tiene integrantes.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100">
                                            {(selectedTeam.members ?? []).map(
                                                (member) =>
                                                    renderMemberRow(
                                                        selectedTeam.id,
                                                        member.student
                                                    )
                                            )}
                                        </ul>
                                    )}

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            handleSaveTeamNote(selectedTeam);
                                        }}
                                        className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3"
                                    >
                                        <span className="text-sm font-semibold text-gray-700">
                                            Nota del equipo
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={maxScore}
                                                value={inputValue(
                                                    teamDraftKey(
                                                        selectedTeam.id
                                                    ),
                                                    getTeamGrade(selectedTeam)
                                                )}
                                                onChange={(e) =>
                                                    setDraft(
                                                        teamDraftKey(
                                                            selectedTeam.id
                                                        ),
                                                        e.target.value
                                                    )
                                                }
                                                className="w-20 px-2 py-1.5 rounded-lg border outline-none transition text-right text-sm font-semibold text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="__"
                                            />
                                            <span className="text-xs text-gray-400">
                                                / {maxScore}
                                            </span>
                                            <button
                                                type="submit"
                                                disabled={
                                                    savingKey ===
                                                        teamDraftKey(
                                                            selectedTeam.id
                                                        ) ||
                                                    !inputValue(
                                                        teamDraftKey(
                                                            selectedTeam.id
                                                        ),
                                                        getTeamGrade(
                                                            selectedTeam
                                                        )
                                                    )
                                                }
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                                            >
                                                {savingKey ===
                                                teamDraftKey(selectedTeam.id)
                                                    ? "Guardando..."
                                                    : "Aplicar a todos"}
                                            </button>
                                        </span>
                                    </form>

                                    <p className="mt-3 text-xs text-gray-400">
                                        La nota del equipo se aplica a todos los
                                        integrantes; las notas individuales la
                                        reemplazan solo para ese estudiante y se
                                        conservan al recalificar el equipo.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-8 text-center">
                                <p className="text-sm text-gray-500">
                                    Selecciona un equipo de la lista para ver y
                                    editar sus notas.
                                </p>
                            </div>
                        )}

                        {unteamedStudents.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                    Estudiantes sin equipo
                                </h3>
                                <ul className="divide-y divide-gray-100">
                                    {unteamedStudents.map((enrollment) =>
                                        renderMemberRow(
                                            null,
                                            enrollment.student
                                        )
                                    )}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};
