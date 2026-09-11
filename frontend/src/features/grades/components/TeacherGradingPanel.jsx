import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAllAssignments } from "@/features/assignments/hooks/useAllAssignments";
import {
    getEnrollments,
    getSections,
} from "@/features/courses/services/courseService";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { useAssignmentGrades } from "@/features/grades/hooks/useAssignmentGrades";
import {
    useGradeStudent,
    useGradeTeam,
} from "@/features/grades/hooks/useGradeMutations";
import { useGradingDrafts } from "@/features/grades/hooks/useGradingDrafts";
import { getTeams } from "@/features/teams/services/teamService";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAllPages } from "@/shared/utils/fetchAllPages";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { SelectField } from "@/shared/components/ui/SelectField";
import { GradeHistoryModal } from "@/features/grades/components/grading/GradeHistoryModal";
import { MemberRow } from "@/features/grades/components/grading/MemberRow";
import { TeamListPanel } from "@/features/grades/components/grading/TeamListPanel";
import { TeamNoteForm } from "@/features/grades/components/grading/TeamNoteForm";
import {
    formatScore,
    memberDraftKey,
    studentName,
    teamDraftKey,
    unteamedDraftKey,
} from "@/features/grades/components/grading/gradingUtils";

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
    const detailRef = useRef(null);
    const [historyGrade, setHistoryGrade] = useState(null);
    const [historyStudent, setHistoryStudent] = useState(null);

    const selectedAssignment = assignments.find(
        (item) => String(item.id) === String(selectedAssignmentId)
    );
    const courseId = selectedAssignment?.course?.id ?? null;

    const { data: sections = [] } = useQuery({
        queryKey: queryKeys.courses.sections(courseId ?? ""),
        queryFn: () => fetchAllPages((params) => getSections(courseId, params)),
        enabled: Boolean(courseId),
        staleTime: 30_000,
    });

    useEffect(() => {
        if (!courseId) {
            setSectionFilter("");
            return;
        }
        setSectionFilter((current) =>
            current && sections.some((s) => String(s.id) === String(current))
                ? current
                : (sections[0]?.id ?? "")
        );
    }, [courseId, sections]);

    const filteredAssignments = courseFilter
        ? assignments.filter(
              (assignment) =>
                  String(assignment.course.id) === String(courseFilter)
          )
        : assignments;

    const { data: rawTeams, isLoading: teamsLoading } = useQuery({
        queryKey: queryKeys.teams.list({
            course: courseId ?? "",
            section: sectionFilter || undefined,
        }),
        queryFn: () =>
            fetchAllPages(getTeams, {
                course: courseId,
                section: sectionFilter || undefined,
            }),
        enabled: Boolean(courseId),
        staleTime: 30_000,
    });

    const { data: rawEnrollments } = useQuery({
        queryKey: queryKeys.courses.enrollments(courseId ?? ""),
        queryFn: () =>
            fetchAllPages((params) => getEnrollments(courseId, params)),
        enabled: Boolean(courseId),
        staleTime: 30_000,
    });

    const teams = useMemo(() => rawTeams ?? [], [rawTeams]);
    const enrollments = rawEnrollments ?? [];

    const students = enrollments.filter(
        (enrollment) => enrollment.status === "APPROVED"
    );

    const teamedIds = useMemo(
        () =>
            new Set(
                teams.flatMap((team) =>
                    (team.members ?? []).map(
                        (member) => String(member.student?.id)
                    )
                )
            ),
        [teams]
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

    const studentPersistedScore = useCallback(
        (studentId) => {
            const grade = gradesByStudentId.get(String(studentId));
            return grade?.score === null || grade?.score === undefined
                ? null
                : Number(grade.score);
        },
        [gradesByStudentId]
    );

    const {
        savingKey,
        setSavingKey,
        setDraft,
        clearDraft,
        clearAll,
        draftValue,
        inputValue,
        beginSave,
        endSave,
        autosaveMemberKey,
        autosaveTeamKey,
        flushPendingDrafts,
    } = useGradingDrafts({
        selectedAssignmentId,
        maxScore,
        overwriteIndividual,
        teams,
        getTeamGrade,
        studentPersistedScore,
        gradeStudentMutation,
        gradeTeamMutation,
    });

    const handleSelectCourse = (e) => {
        setCourseFilter(e.target.value);
        setSelectedAssignmentId("");
        setSelectedTeamId(null);
        setSectionFilter("");
        flushPendingDrafts();
        clearAll();
    };

    const handleSelectAssignment = (e) => {
        setSelectedAssignmentId(e.target.value);
        flushPendingDrafts();
        clearAll();
    };

    const handleSelectTeam = (teamId) => {
        setSelectedTeamId(teamId);
        setOverwriteIndividual(false);
        if (window.innerWidth < 1024 && detailRef.current) {
            setTimeout(() => {
                detailRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 0);
        }
    };

    const handleSaveTeamNote = async (team) => {
        const key = teamDraftKey(team.id);
        const raw = draftValue(key);
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
        const raw = draftValue(key);
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

    const openHistory = useCallback((student, grade) => {
        setHistoryStudent(student);
        setHistoryGrade(grade);
    }, []);

    const closeHistory = useCallback(() => {
        setHistoryGrade(null);
        setHistoryStudent(null);
    }, []);

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

    const selectedTeam = teams.find(
        (team) => String(team.id) === String(selectedTeamId)
    ) ?? null;

    const renderMemberRow = (teamId, student) => {
        const key =
            teamId === null
                ? unteamedDraftKey(student.id)
                : memberDraftKey(teamId, student.id);
        const fallback = getEffectiveScore(student.id, null);
        const individual = isIndividual(student.id);
        const grade = gradesByStudentId.get(String(student.id));

        return (
            <MemberRow
                teamId={teamId}
                draftKey={key}
                student={student}
                grade={grade}
                individual={individual}
                fallback={fallback}
                maxScore={maxScore}
                inputValue={inputValue}
                setDraft={setDraft}
                savingKey={savingKey}
                onSave={handleSaveMember}
                onAutosave={autosaveMemberKey}
                onOpenHistory={openHistory}
            />
        );
    };

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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-4">
                <div className="min-w-[180px] flex-1">
                    <SelectField
                        label="Curso"
                        value={courseFilter}
                        onChange={handleSelectCourse}
                    >
                        <option value="">Todos los cursos</option>
                        {(courses ?? []).map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </SelectField>
                </div>
                <div className="min-w-[220px] flex-[2]">
                    <SelectField
                        label="Asignación"
                        value={selectedAssignmentId}
                        onChange={handleSelectAssignment}
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
                    </SelectField>
                    {filteredAssignments.length === 0 && (
                        <p className="text-sm text-gray-500 py-2.5">
                            Este curso no tiene asignaciones.
                        </p>
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
                    <TeamListPanel
                        sections={sections}
                        sectionFilter={sectionFilter}
                        setSectionFilter={setSectionFilter}
                        teamsLoading={teamsLoading}
                        teamCount={teams.length}
                        visibleTeams={visibleTeams}
                        ungradedTeams={ungradedTeams}
                        gradedTeams={gradedTeams}
                        selectedTeamId={selectedTeamId}
                        handleSelectTeam={handleSelectTeam}
                        teamNameQuery={teamNameQuery}
                        setTeamNameQuery={setTeamNameQuery}
                        maxScore={maxScore}
                        getTeamGrade={getTeamGrade}
                    />

                    <section ref={detailRef} className="space-y-6 min-w-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                                Información de la asignación
                            </h2>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {selectedAssignment.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Puntaje máximo: {maxScore}
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

                                    <TeamNoteForm
                                        team={selectedTeam}
                                        hasIndividual={(selectedTeam.members ??
                                            []).some((member) =>
                                            isIndividual(member.student?.id)
                                        )}
                                        overwriteIndividual={
                                            overwriteIndividual
                                        }
                                        setOverwriteIndividual={
                                            setOverwriteIndividual
                                        }
                                        maxScore={maxScore}
                                        inputValue={inputValue}
                                        setDraft={setDraft}
                                        savingKey={savingKey}
                                        getTeamGrade={getTeamGrade}
                                        onSubmit={handleSaveTeamNote}
                                        onAutosave={autosaveTeamKey}
                                    />
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
                <GradeHistoryModal
                    student={historyStudent}
                    grade={historyGrade}
                    assignment={selectedAssignment}
                    maxScore={maxScore}
                    onClose={closeHistory}
                />
            )}
        </div>
    );
};