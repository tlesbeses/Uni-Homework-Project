import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useTeams } from "@/features/teams/hooks/useTeams";
import { useDeleteTeam } from "@/features/teams/hooks/useTeamMutations";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { CreateTeamModal } from "@/features/teams/components/CreateTeamModal";
import { EditTeamModal } from "@/features/teams/components/EditTeamModal";
import {
    getCourses,
    getEnrollments,
    getSections,
} from "@/features/courses/services/courseService";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

export const TeamsPage = () => {
    const { user, isTeacher } = useAuth();
    const navigate = useNavigate();
    const { teams, loading, error, loadTeams } = useTeams();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);
    const [filterCourse, setFilterCourse] = useState("");
    const [filterSection, setFilterSection] = useState("");
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [sections, setSections] = useState([]);
    const [pendingDelete, setPendingDelete] = useState(null);

    const deleteMutation = useDeleteTeam();

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [coursesData, enrollmentsData, sectionsData] =
                    await Promise.all([
                        getCourses({ page_size: 100 }),
                        getEnrollments(null, { page_size: 100 }),
                        getSections(null, { page_size: 100 }),
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

    // Profesores: secciones derivadas de los equipos, dependiendo del curso.
    const teacherSectionOptions = useMemo(() => {
        const map = new Map();
        teams.forEach((team) => {
            const section = team.section;
            if (!section) {
                return;
            }
            if (filterCourse && section.course?.id !== Number(filterCourse)) {
                return;
            }
            map.set(section.id, section);
        });
        return [...map.values()];
    }, [teams, filterCourse]);

    // Estudiantes: solo los grupos (secciones) a los que pertenecen.
    const studentSectionOptions = useMemo(() => {
        const map = new Map();
        enrollments.forEach((enrollment) => {
            if (enrollment.status === "APPROVED" && enrollment.section) {
                map.set(enrollment.section.id, enrollment.section);
            }
        });
        return [...map.values()];
    }, [enrollments]);

    const visibleTeams = useMemo(
        () =>
            teams.filter((team) => {
                if (
                    filterCourse &&
                    team.section?.course?.id !== Number(filterCourse)
                ) {
                    return false;
                }
                if (
                    filterSection &&
                    team.section?.id !== Number(filterSection)
                ) {
                    return false;
                }
                return true;
            }),
        [teams, filterCourse, filterSection]
    );

    const handleCourseChange = (event) => {
        setFilterCourse(event.target.value);
        setFilterSection("");
    };

    const confirmDelete = async () => {
        const teamId = pendingDelete;
        setPendingDelete(null);
        setDeletingId(teamId);
        try {
            await deleteMutation.mutateAsync(teamId);
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

            {isTeacher ? (
                (courseOptions.length > 0 ||
                    teacherSectionOptions.length > 0) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Filtrar por curso
                            </label>
                            <select
                                value={filterCourse}
                                onChange={handleCourseChange}
                                className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todos los cursos</option>
                                {(courseOptions ?? []).map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Filtrar por sección
                            </label>
                            <select
                                value={filterSection}
                                onChange={(event) =>
                                    setFilterSection(event.target.value)
                                }
                                disabled={!filterCourse}
                                className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value="">
                                    {filterCourse
                                        ? "Todas las secciones"
                                        : "Primero selecciona un curso"}
                                </option>
                                {(teacherSectionOptions ?? []).map(
                                    (section) => (
                                        <option
                                            key={section.id}
                                            value={section.id}
                                        >
                                            {section.name}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>
                )
            ) : (
                studentSectionOptions.length > 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Filtrar por grupo
                        </label>
                        <select
                            value={filterSection}
                            onChange={(event) =>
                                setFilterSection(event.target.value)
                            }
                            className="w-full max-w-md px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Todos mis grupos</option>
                            {(studentSectionOptions ?? []).map((section) => (
                                <option key={section.id} value={section.id}>
                                    {section.course?.title
                                        ? `${section.course.title} — ${section.name}`
                                        : section.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )
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
                        onDelete={(teamId) => {
                            const team = visibleTeams.find(t => t.id === teamId);
                            setPendingDelete(team || { id: teamId, name: "" });
                        }}
                        onEdit={setEditingTeam}
                        deleting={deletingId === team.id}
                        roleLabel={
                            isTeacher
                                ? null
                                : team.leader?.id === user?.id
                                  ? "Líder"
                                  : "Miembro"
                        }
                    />
                ))}
            </div>

            <CreateTeamModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={async (createdTeam) => {
                    await loadTeams();
                    setIsCreateOpen(false);
                    if (createdTeam?.id) {
                        navigate(`/teams/${createdTeam.id}`);
                    }
                }}
                courses={courses}
                enrollments={enrollments}
                teams={teams}
                sections={sections}
                isTeacher={isTeacher}
                userId={user?.id}
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

            <ConfirmModal
                open={Boolean(pendingDelete)}
                title="Eliminar equipo"
                description={
                    pendingDelete
                        ? `¿Eliminar el equipo "${pendingDelete.name}" y todos sus miembros? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmLabel="Eliminar"
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                busy={Boolean(deletingId)}
            />
        </div>
    );
};
