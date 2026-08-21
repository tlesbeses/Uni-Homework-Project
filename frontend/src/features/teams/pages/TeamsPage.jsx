import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useTeams } from "@/features/teams/hooks/useTeams";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { CreateTeamModal } from "@/features/teams/components/CreateTeamModal";
import { EditTeamModal } from "@/features/teams/components/EditTeamModal";
import { deleteTeam } from "@/features/teams/services/teamService";
import {
    getCourses,
    getEnrollments,
    getSections,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const TeamsPage = () => {
    const { user, isTeacher } = useAuth();
    const { teams, loading, error, loadTeams } = useTeams();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);
    const [filterCourse, setFilterCourse] = useState("");
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [sections, setSections] = useState([]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [coursesData, enrollmentsData, sectionsData] =
                    await Promise.all([
                        getCourses(),
                        getEnrollments(),
                        getSections(),
                    ]);
                if (!active) {
                    return;
                }
                setCourses(Array.isArray(coursesData.results) ? coursesData.results : Array.isArray(coursesData) ? coursesData : []);
                setEnrollments(Array.isArray(enrollmentsData.results) ? enrollmentsData.results : Array.isArray(enrollmentsData) ? enrollmentsData : []);
                setSections(Array.isArray(sectionsData.results) ? sectionsData.results : Array.isArray(sectionsData) ? sectionsData : []);
            } catch {
                // Las opciones del modal simplemente quedarán vacías.
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const courseOptions = useMemo(() => {
        const map = new Map();
        teams.forEach((team) => {
            const course = team.section?.course;
            if (course) {
                map.set(course.id, course);
            }
        });
        return [...map.values()];
    }, [teams]);

    const visibleTeams = filterCourse
        ? teams.filter(
              (team) => team.section?.course?.id === Number(filterCourse)
          )
        : teams;

    const handleDelete = async (teamId) => {
        if (!window.confirm("¿Eliminar este equipo y todos sus miembros?")) {
            return;
        }
        setDeletingId(teamId);
        try {
            await deleteTeam(teamId);
            toast.success("Equipo eliminado");
            await loadTeams();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Equipos</h1>
                    <p className="text-sm text-gray-500">
                        {isTeacher
                            ? "Gestiona los equipos de tus cursos."
                            : "Crea o consulta los equipos de tus cursos."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition"
                >
                    + Nuevo equipo
                </button>
            </div>

            {courseOptions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Filtrar por curso
                    </label>
                    <select
                        value={filterCourse}
                        onChange={(event) => setFilterCourse(event.target.value)}
                        className="w-full max-w-md px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Todos los cursos</option>
                        {(courseOptions ?? []).map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {loading && <p className="text-gray-500">Cargando equipos...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && visibleTeams.length === 0 && (
                <p className="text-gray-500">No hay equipos disponibles.</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(visibleTeams ?? []).map((team) => (
                    <TeamCard
                        key={team.id}
                        team={team}
                        canManage={isTeacher || team.leader?.id === user?.id}
                        onDelete={handleDelete}
                        onEdit={setEditingTeam}
                        deleting={deletingId === team.id}
                    />
                ))}
            </div>

            <CreateTeamModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={async () => {
                    await loadTeams();
                    setIsCreateOpen(false);
                }}
                courses={courses}
                enrollments={enrollments}
                teams={teams}
                sections={sections}
                isTeacher={isTeacher}
            />

            <EditTeamModal
                team={editingTeam}
                open={Boolean(editingTeam)}
                onClose={() => setEditingTeam(null)}
                onSaved={async () => {
                    await loadTeams();
                    setEditingTeam(null);
                }}
            />
        </div>
    );
};
