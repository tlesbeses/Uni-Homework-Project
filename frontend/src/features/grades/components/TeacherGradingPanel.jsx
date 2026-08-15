import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAllAssignments } from "@/features/assignments/hooks/useAllAssignments";
import { getEnrollments } from "@/features/courses/services/courseService";
import { GradeOriginBadge } from "@/features/grades/components/GradeOriginBadge";
import { useAssignmentGrades } from "@/features/grades/hooks/useAssignmentGrades";
import { gradeStudent, gradeTeam } from "@/features/grades/services/gradeService";
import { getTeams } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const TeacherGradingPanel = () => {
    const { assignments, loading: assignmentsLoading } = useAllAssignments();
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [teams, setTeams] = useState([]);
    const [students, setStudents] = useState([]);
    const [teamId, setTeamId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [teamScore, setTeamScore] = useState("");
    const [studentScore, setStudentScore] = useState("");
    const [submittingTeam, setSubmittingTeam] = useState(false);
    const [submittingStudent, setSubmittingStudent] = useState(false);

    const { grades, loading: gradesLoading, reload: reloadGrades } =
        useAssignmentGrades(selectedAssignmentId);

    useEffect(() => {
        const assignment = assignments.find(
            (item) => String(item.id) === String(selectedAssignmentId)
        );
        if (!assignment) {
            setTeams([]);
            setStudents([]);
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const [teamData, enrollmentData] = await Promise.all([
                    getTeams({ course: assignment.course.id }),
                    getEnrollments(assignment.course.id),
                ]);
                if (!active) {
                    return;
                }
                setTeams(teamData.results ?? teamData);
                setStudents(
                    (enrollmentData.results ?? enrollmentData).filter(
                        (enrollment) => enrollment.status === "APPROVED"
                    )
                );
            } catch (err) {
                if (active) {
                    toast.error(getErrorMessage(err));
                }
            }
        };

        setTeamId("");
        setStudentId("");
        load();

        return () => {
            active = false;
        };
    }, [selectedAssignmentId, assignments]);

    const handleGradeTeam = async (e) => {
        e.preventDefault();
        if (!selectedAssignmentId || !teamId || !teamScore) {
            return;
        }
        setSubmittingTeam(true);
        try {
            await gradeTeam(selectedAssignmentId, teamId, teamScore);
            toast.success("Equipo calificado");
            await reloadGrades();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmittingTeam(false);
        }
    };

    const handleGradeStudent = async (e) => {
        e.preventDefault();
        if (!selectedAssignmentId || !studentId || !studentScore) {
            return;
        }
        setSubmittingStudent(true);
        try {
            await gradeStudent(selectedAssignmentId, studentId, studentScore);
            toast.success("Estudiante calificado");
            await reloadGrades();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmittingStudent(false);
        }
    };

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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Asignación
                </label>
                <select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">Selecciona una asignación...</option>
                    {assignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>
                            {assignment.course.title} — {assignment.title}{" "}
                            (máx. {assignment.max_score})
                        </option>
                    ))}
                </select>
            </div>

            {selectedAssignmentId && (
                <>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                                Calificar equipo
                            </h2>
                            {teams.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Este curso no tiene equipos.
                                </p>
                            ) : (
                                <form onSubmit={handleGradeTeam} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                            Equipo
                                        </label>
                                        <select
                                            value={teamId}
                                            onChange={(e) => setTeamId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Selecciona un equipo...</option>
                                            {teams.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} (
                                                    {team.members
                                                        .map((m) => m.student.first_name || m.student.username)
                                                        .join(", ")})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                            Puntaje
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={teamScore}
                                            onChange={(e) => setTeamScore(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="100"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingTeam || !teamId || !teamScore}
                                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-60"
                                    >
                                        {submittingTeam ? "Calificando..." : "Calificar equipo"}
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                                Calificar individualmente
                            </h2>
                            {students.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Este curso no tiene estudiantes aprobados.
                                </p>
                            ) : (
                                <form
                                    onSubmit={handleGradeStudent}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                            Estudiante
                                        </label>
                                        <select
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Selecciona un estudiante...</option>
                                            {students.map((enrollment) => (
                                                <option
                                                    key={enrollment.id}
                                                    value={enrollment.student.id}
                                                >
                                                    {enrollment.student.first_name ||
                                                        enrollment.student.username}{" "}
                                                    {enrollment.student.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                            Puntaje
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={studentScore}
                                            onChange={(e) => setStudentScore(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="100"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingStudent || !studentId || !studentScore}
                                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-60"
                                    >
                                        {submittingStudent
                                            ? "Calificando..."
                                            : "Calificar estudiante"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            Calificaciones de la asignación
                        </h2>
                        {gradesLoading ? (
                            <p className="text-sm text-gray-500">
                                Cargando calificaciones...
                            </p>
                        ) : grades.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Esta asignación aún no tiene calificaciones.
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {grades.map((grade) => (
                                    <li
                                        key={grade.id}
                                        className="py-3 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <p className="text-sm font-medium text-gray-800">
                                                {grade.student.first_name ||
                                                    grade.student.username}{" "}
                                                {grade.student.last_name}
                                            </p>
                                            <GradeOriginBadge
                                                isIndividual={grade.is_individual}
                                            />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800 shrink-0">
                                            {grade.score} /{" "}
                                            {grade.assignment.max_score}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
