import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAllAssignments } from "@/features/assignments/hooks/useAllAssignments";
import { getEnrollments, getSections } from "@/features/courses/services/courseService";
import { useAllData } from "@/shared/hooks/useAllData";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { useAssignmentGrades } from "@/features/grades/hooks/useAssignmentGrades";
import {
    useGradeStudent,
    useGradeTeam,
} from "@/features/grades/hooks/useGradeMutations";
import { getTeams } from "@/features/teams/services/teamService";
import { getGradeHistory } from "@/features/grades/services/gradeService";
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
    const [searchParams] = useSearchParams();
    const [courseFilter, setCourseFilter] = useState("");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(
        () => searchParams.get("assignment") ?? ""
    );
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamNameQuery, setTeamNameQuery] = useState("");
    const [sectionFilter, setSectionFilter] = useState(
        () => searchParams.get("section") ?? ""
    );
    const [overwriteIndividual, setOverwriteIndividual] = useState(false);
    const [drafts, setDrafts] = useState({});
    const [savingKey, setSavingKey] = useState(null);
    const inFlightRef = useRef(new Set());
    const detailRef = useRef(null);
    const [historyGrade, setHistoryGrade] = useState(null);
    const [historyStudent, setHistoryStudent] = useState(null);
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const selectedAssignment = assignments.find(
        (item) => String(item.id) === String(selectedAssignmentId)
    );
    const courseId = selectedAssignment?.course?.id ?? null;

    const [sections, setSections] = useState([]);
    useEffect(() => {
        if (!courseId) {
            setSections([]);
            setSectionFilter("");
            return;
        }
        let active = true;
        getSections(courseId, { page_size: 100 })
            .then((data) => {
                if (active) {
                    const list = data?.results ?? data ?? [];
                    setSections(list);
                    setSectionFilter((current) =>
                        current && list.some((s) => String(s.id) === String(current))
                            ? current
                            : (list[0]?.id ?? "")
                    );
                }
            })
            .catch(() => {
                if (active) {
                    setSections([]);
                    setSectionFilter("");
                }
            });
        return () => {
            active = false;
        };
    }, [courseId]);

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
                    ? getTeams({
                          course: courseId,
                          section: sectionFilter || undefined,
                          ...params,
                      })
                    : Promise.resolve([]),
            [courseId, sectionFilter]
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
        (enrollment) =>
            !teamedIds.has(String(enrollment.student.id)) &&
            (!sectionFilter ||
                String(enrollment.section?.id) === String(sectionFilter))
    );

    const { grades, loading: gradesLoading } =
        useAssignmentGrades(selectedAssignmentId);

    const gradeTeamMutation = useGradeTeam();
    const gradeStudentMutation = useGradeStudent();

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
            // 1. An applied team note: members share a non-individual grade.
            for (const member of team.members ?? []) {
                const grade = gradesByStudentId.get(
                    String(member.student?.id)
                );
                if (grade && !grade.is_individual) {
                    return Number(grade.score);
                }
            }
            // 2. Without a team note, the leader's individual grade stands
            //    for the team (this also covers single-member teams).
            const leaderGrade = gradesByStudentId.get(String(team.leader?.id));
            if (leaderGrade) {
                return Number(leaderGrade.score);
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

    const setDraft = useCallback((key, value) =>
        setDrafts((prev) => ({ ...prev, [key]: value })), []);

    const clearDraft = useCallback((key) =>
        setDrafts((prev) => {
            if (!(key in prev)) {
                return prev;
            }
            const next = { ...prev };
            delete next[key];
            return next;
        }), []);

    const beginSave = useCallback((key) => {
        if (inFlightRef.current.has(key)) {
            return false;
        }
        inFlightRef.current.add(key);
        return true;
    }, []);

    const endSave = useCallback((key) => {
        inFlightRef.current.delete(key);
    }, []);

    const isValidScore = (raw) => {
        if (raw === "" || raw === null || raw === undefined) {
            return false;
        }
        const value = Number(raw);
        return (
            Number.isFinite(value) &&
            value >= 0 &&
            value <= maxScore
        );
    };

    const studentPersistedScore = (studentId) => {
        const grade = gradesByStudentId.get(String(studentId));
        return grade?.score === null || grade?.score === undefined
            ? null
            : Number(grade.score);
    };

    const autosaveMemberKey = useCallback(
        async (key) => {
            const raw = drafts[key];
            if (!selectedAssignmentId || raw === "" || raw === undefined) {
                return;
            }
            if (!isValidScore(raw)) {
                return;
            }
            const studentId =
                key.startsWith("m:")
                    ? key.split(":").pop()
                    : key.startsWith("u:")
                      ? key.slice(2)
                      : null;
            if (!studentId) {
                return;
            }
            const persisted = studentPersistedScore(studentId);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                return;
            }
            if (!beginSave(key)) {
                return;
            }
            setSavingKey(key);
            try {
                await gradeStudentMutation.mutateAsync({
                    assignmentId: selectedAssignmentId,
                    studentId,
                    score: raw,
                });
                clearDraft(key);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingKey(null);
                endSave(key);
            }
        },
        [
            drafts,
            selectedAssignmentId,
            gradesByStudentId,
            beginSave,
            endSave,
            clearDraft,
            gradeStudentMutation,
            maxScore,
        ]
    );

    const autosaveTeamKey = useCallback(
        async (key) => {
            if (!selectedAssignmentId || !key.startsWith("t:")) {
                return;
            }
            const teamId = key.slice(2);
            const team = teams.find(
                (item) => String(item.id) === String(teamId)
            );
            if (!team) {
                return;
            }
            const raw = drafts[key];
            if (!raw) {
                return;
            }
            if (!isValidScore(raw)) {
                return;
            }
            const persisted = getTeamGrade(team);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                return;
            }
            if (!beginSave(key)) {
                return;
            }
            setSavingKey(key);
            try {
                await gradeTeamMutation.mutateAsync({
                    assignmentId: selectedAssignmentId,
                    teamId: team.id,
                    score: raw,
                    overwriteIndividual,
                });
                clearDraft(key);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingKey(null);
                endSave(key);
            }
        },
        [
            drafts,
            selectedAssignmentId,
            teams,
            overwriteIndividual,
            getTeamGrade,
            beginSave,
            endSave,
            clearDraft,
            gradeTeamMutation,
            maxScore,
        ]
    );

    const flushPendingDrafts = useCallback(async () => {
        const pending = [];
        for (const [key, raw] of Object.entries(drafts)) {
            if (!isValidScore(raw)) {
                continue;
            }
            if (key.startsWith("t:")) {
                const teamId = key.slice(2);
                const team = teams.find(
                    (item) => String(item.id) === String(teamId)
                );
                if (!team) {
                    continue;
                }
                const persisted = getTeamGrade(team);
                if (persisted !== null && Number(raw) === persisted) {
                    clearDraft(key);
                    continue;
                }
                pending.push(
                    (async () => {
                        if (!beginSave(key)) {
                            return;
                        }
                        try {
                            await gradeTeamMutation.mutateAsync({
                                assignmentId: selectedAssignmentId,
                                teamId: team.id,
                                score: raw,
                                overwriteIndividual,
                            });
                            clearDraft(key);
                        } catch (err) {
                            toast.error(getErrorMessage(err));
                        } finally {
                            endSave(key);
                        }
                    })()
                );
                continue;
            }
            const studentId =
                key.startsWith("m:")
                    ? key.split(":").pop()
                    : key.startsWith("u:")
                      ? key.slice(2)
                      : null;
            if (!studentId) {
                continue;
            }
            const persisted = studentPersistedScore(studentId);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                continue;
            }
            pending.push(
                (async () => {
                    if (!beginSave(key)) {
                        return;
                    }
                    try {
                        await gradeStudentMutation.mutateAsync({
                            assignmentId: selectedAssignmentId,
                            studentId,
                            score: raw,
                        });
                        clearDraft(key);
                    } catch (err) {
                        toast.error(getErrorMessage(err));
                    } finally {
                        endSave(key);
                    }
                })()
            );
        }
        if (pending.length > 0) {
            await Promise.all(pending);
        }
    }, [
        drafts,
        teams,
        selectedAssignmentId,
        overwriteIndividual,
        gradesByStudentId,
        getTeamGrade,
        beginSave,
        endSave,
        clearDraft,
        gradeStudentMutation,
        gradeTeamMutation,
        maxScore,
    ]);

    const handleSelectCourse = (e) => {
        setCourseFilter(e.target.value);
        setSelectedAssignmentId("");
        setSelectedTeamId(null);
        setSectionFilter("");
        flushPendingDrafts();
        setDrafts({});
    };

    const handleSelectAssignment = (e) => {
        setSelectedAssignmentId(e.target.value);
        flushPendingDrafts();
        setDrafts({});
    };

    const handleSelectTeam = (teamId) => {
        setSelectedTeamId(teamId);
        setOverwriteIndividual(false);
        if (window.innerWidth < 1024 && detailRef.current) {
            setTimeout(() => {
                detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
        }
    };

    const handleSaveTeamNote = async (team) => {
        const key = teamDraftKey(team.id);
        const raw = drafts[key];
        if (!selectedAssignmentId || !team?.id || !raw) {
            return;
        }
        const membersList = team.members ?? [];
        const individualCount = membersList.filter((member) =>
            isIndividual(member.student?.id)
        ).length;

        if (!overwriteIndividual && individualCount === membersList.length) {
            toast.info(
                "Todos los integrantes tienen nota individual. Marca la casilla para sobrescribirlos con la nota del equipo."
            );
            return;
        }

        if (!beginSave(key)) {
            return;
        }
        setSavingKey(key);
        try {
            await gradeTeamMutation.mutateAsync({
                assignmentId: selectedAssignmentId,
                teamId: team.id,
                score: raw,
                overwriteIndividual,
            });
            if (overwriteIndividual) {
                toast.success(
                    `Nota aplicada a todo el ${team.name} (incluidas las notas individuales)`
                );
            } else if (individualCount > 0) {
                toast.success(
                    `Nota aplicada a ${membersList.length - individualCount} de ${
                        membersList.length
                    } integrantes; ${individualCount} conservaron su nota individual`
                );
            } else {
                toast.success(`Nota aplicada al ${team.name}`);
            }
            clearDraft(key);
            setOverwriteIndividual(false);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingKey(null);
            endSave(key);
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
        if (!beginSave(key)) {
            return;
        }
        setSavingKey(key);
        try {
            await gradeStudentMutation.mutateAsync({
                assignmentId: selectedAssignmentId,
                studentId,
                score: raw,
            });
            toast.success("Nota individual guardada");
            clearDraft(key);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingKey(null);
            endSave(key);
        }
    };

    const visibleTeams = teams.filter((team) => {
        const words = teamNameQuery
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
        if (words.length === 0) {
            return true;
        }
        const teamStr = team.name.toLowerCase();
        if (words.every((w) => teamStr.includes(w))) {
            return true;
        }
        return (team.members ?? []).some((m) => {
            const name = studentName(m.student).toLowerCase();
            return words.every((w) => name.includes(w));
        });
    });

    const gradedTeams = useMemo(
        () => visibleTeams.filter((t) => getTeamGrade(t) !== null),
        [visibleTeams, getTeamGrade]
    );
    const ungradedTeams = useMemo(
        () => visibleTeams.filter((t) => getTeamGrade(t) === null),
        [visibleTeams, getTeamGrade]
    );

    const openHistory = useCallback(
        async (student, grade) => {
            setHistoryStudent(student);
            setHistoryGrade(grade);
            setHistory(null);
            setHistoryLoading(true);
            try {
                const data = await getGradeHistory(grade.id);
                setHistory(Array.isArray(data) ? data : data?.results ?? []);
            } catch (err) {
                toast.error(getErrorMessage(err));
                setHistoryGrade(null);
                setHistoryStudent(null);
            } finally {
                setHistoryLoading(false);
            }
        },
        []
    );

    const closeHistory = useCallback(() => {
        setHistoryGrade(null);
        setHistoryStudent(null);
        setHistory(null);
    }, []);

    const selectedTeam = teams.find(
        (team) => String(team.id) === String(selectedTeamId)
    ) ?? null;

    if (assignmentsLoading) {
        return <p className="text-gray-500">Cargando asignaciones...</p>;
    }

    if (assignments.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                No tienes asignaciones para evaluar.
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
        const grade = gradesByStudentId.get(String(student.id));

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
                    {grade && (
                        <button
                            type="button"
                            onClick={() => openHistory(student, grade)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                            title="Ver historial de notas"
                        >
                            Historial
                        </button>
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
                        onBlur={() => autosaveMemberKey(key)}
                        onFocus={(e) => e.target.select()}
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

                        {sections.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Grupo de clase
                                </label>
                                <select
                                    value={sectionFilter}
                                    onChange={(e) =>
                                        setSectionFilter(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {sections.map((section) => (
                                        <option
                                            key={section.id}
                                            value={section.id}
                                        >
                                            {section.name}
                                        </option>
                                    ))}
                                </select>
                                {sectionFilter && (
                                    <Link
                                        to={`/grades/report?section=${sectionFilter}`}
                                        className="mt-2 block w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition text-center"
                                    >
                                        Ver reporte
                                    </Link>
                                )}
                            </div>
                        )}

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
                            <div className="space-y-3 -mx-2">
                                {ungradedTeams.length > 0 && (
                                    <div>
                                        <p className="px-2 mb-1 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                            Sin calificar ({ungradedTeams.length})
                                        </p>
                                        <ul className="divide-y divide-gray-100">
                                            {ungradedTeams.map((team, index) => {
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
                                    </div>
                                )}

                                {gradedTeams.length > 0 && (
                                    <div>
                                        <p className="px-2 mb-1 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                            Calificados ({gradedTeams.length})
                                        </p>
                                        <ul className="divide-y divide-gray-100">
                                            {gradedTeams.map((team, index) => {
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
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>

                    <section ref={detailRef} className="space-y-6 min-w-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                                Información de la asignación
                            </h2>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {selectedAssignment.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Puntaje máximo: {maxScore} · Peso en la nota
                                final: {selectedAssignment.weight ?? "1.00"}
                            </p>
                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                                {selectedAssignment.description ||
                                    selectedAssignment.course.description ||
                                    "Esta asignación no tiene descripción."}
                            </p>
                        </div>

                        {gradesLoading ? (
                            <p className="text-sm text-gray-500">
                                Cargando evaluaciones...
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

                                    {(selectedTeam.members ?? []).some(
                                        (member) =>
                                            isIndividual(member.student?.id)
                                    ) && (
                                        <label className="mt-4 flex items-center gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={overwriteIndividual}
                                                onChange={(e) =>
                                                    setOverwriteIndividual(
                                                        e.target.checked
                                                    )
                                                }
                                                className="accent-indigo-600 w-4 h-4"
                                            />
                                            Sobrescribir también las notas
                                            individuales al aplicar la nota del
                                            equipo
                                        </label>
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
                                                onBlur={() =>
                                                    autosaveTeamKey(
                                                        teamDraftKey(
                                                            selectedTeam.id
                                                        )
                                                    )
                                                }
                                                onFocus={(e) => e.target.select()}
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
                                        conservan al reevaluar el equipo.
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

            {historyGrade && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
                    onClick={closeHistory}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">
                                    Historial de {studentName(historyStudent)}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {selectedAssignment.title} —{" "}
                                    {maxScore} puntos
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeHistory}
                                aria-label="Cerrar"
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-auto px-6 py-4">
                            {historyLoading ? (
                                <p className="text-sm text-gray-500">
                                    Cargando historial...
                                </p>
                            ) : history?.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Sin registros.
                                </p>
                            ) : (
                                <ol className="space-y-3">
                                    {(history ?? []).map((entry) => {
                                        const isCreation = entry.first_record;
                                        return (
                                            <li
                                                key={entry.id}
                                                className="flex items-start justify-between gap-3 text-sm"
                                            >
                                                <div>
                                                    <p className="text-gray-800 font-semibold">
                                                        {isCreation
                                                            ? "Nota registrada"
                                                            : "Nota actualizada"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        <span className="font-medium text-gray-600">
                                                            {entry.graded_by
                                                                ? `${entry.graded_by.first_name || entry.graded_by.username} ${
                                                                      entry.graded_by.last_name ?? ""
                                                                  }`.trim()
                                                                : "—"}
                                                        </span>{" "}
                                                        •{" "}
                                                        {new Date(
                                                            entry.created_at
                                                        ).toLocaleString("es-ES", {
                                                            dateStyle: "short",
                                                            timeStyle: "short",
                                                        })}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-gray-800 shrink-0">
                                                    {isCreation
                                                        ? ""
                                                        : `${entry.old_score} → `}
                                                    {entry.new_score}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
