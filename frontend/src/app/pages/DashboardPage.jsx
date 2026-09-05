import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useDashboard } from "@/features/courses/hooks/useDashboard";
import {
    actionLabel,
    actionStyle,
    activityDetailLines,
    actorName,
    entityTypeLabel,
    targetName,
} from "@/shared/utils/activityMeta";

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return "Buenos días";
    }
    if (hour < 18) {
        return "Buenas tardes";
    }
    return "Buenas noches";
}

function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
        return "Ahora mismo";
    }
    if (diffMins < 60) {
        return `Hace ${diffMins} min`;
    }
    if (diffHours < 24) {
        return `Hace ${diffHours}h`;
    }
    if (diffDays < 7) {
        return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    }
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function DashboardPage() {
    const { user, isTeacher, isStudent, isAdmin } = useAuth();
    const { stats, loading } = useDashboard(user?.id);

    if (loading) {
        return <DashboardSkeleton />;
    }

    const userName = user?.first_name || user?.username || "";

    // El panel admin solo debe verse si el usuario es realmente root y el
    // backend lo identificó como tal; durante una impersonación nunca debe
    // filtrarse aunque un `stats` quedara con datos viejos.
    const isAdminStats = stats?.type === "admin" && isAdmin;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {getGreeting()} 👋
                </h1>
                <p className="text-gray-500 mt-1">
                    {userName
                        ? `Bienvenido de vuelta, ${userName}`
                        : "Bienvenido al panel de control"}
                </p>
            </div>

            {isAdminStats && <AdminDashboard stats={stats} />}

            {!isAdminStats && isTeacher && stats?.type === "teacher" && (
                <TeacherDashboard stats={stats} />
            )}

            {!isAdminStats && isStudent && stats?.type === "student" && (
                <StudentDashboard stats={stats} />
            )}

            {(!isAdminStats && !isTeacher && !isStudent) && (
                <p className="text-gray-400 text-sm">
                    No hay datos disponibles para tu perfil.
                </p>
            )}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-28 bg-gray-200 rounded-xl"
                    />
                ))}
            </div>
            <div className="h-6 w-48 bg-gray-200 rounded-lg mt-8" />
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-16 bg-gray-200 rounded-xl"
                    />
                ))}
            </div>
        </div>
    );
}

function AdminDashboard({ stats }) {
    const s = stats.stats ?? {};
    const recentUsers = stats.recent_users ?? [];
    const recentImpersonations = stats.recent_impersonations ?? [];
    const recentActivity = stats.recent_activity ?? [];
    const recentCourses = stats.recent_courses ?? [];

    return (
        <>
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Vista general del sistema
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Usuarios"
                        value={s.users_total ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                        }
                        color="indigo"
                    />
                    <StatCard
                        label="Profesores"
                        value={s.teachers ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                            />
                        }
                        color="sky"
                    />
                    <StatCard
                        label="Estudiantes"
                        value={s.students ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                        }
                        color="emerald"
                    />
                    <StatCard
                        label="Cursos"
                        value={s.courses ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                            />
                        }
                        color="amber"
                    />
                    <StatCard
                        label="Inscripciones pendientes"
                        value={s.pending_enrollments ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        }
                        color="rose"
                    />
                    <StatCard
                        label="Usuarios activos"
                        value={s.users_active ?? 0}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        }
                        color="indigo"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                            Registrados recientemente
                        </h2>
                        <Link
                            to="/admin/users"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Gestionar usuarios →
                        </Link>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {recentUsers.length === 0 && (
                            <p className="px-5 py-8 text-center text-gray-400 text-sm">
                                No hay usuarios registrados.
                            </p>
                        )}
                        {recentUsers.slice(0, 5).map((u) => (
                            <UserRow
                                key={u.id}
                                name={
                                    u.first_name && u.last_name
                                        ? `${u.first_name} ${u.last_name}`
                                        : u.username
                                }
                                subtitle={`@${u.username}${u.email ? ` · ${u.email}` : ""}`}
                                time={formatRelativeTime(u.date_joined)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        Impersonados recientemente
                    </h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {recentImpersonations.length === 0 && (
                            <p className="px-5 py-8 text-center text-gray-400 text-sm">
                                No hay impersonaciones registradas.
                            </p>
                        )}
                        {recentImpersonations.slice(0, 5).map((log) => {
                            const t = log.target ?? {};
                            const adminName = log.admin
                                ? log.admin.first_name && log.admin.last_name
                                    ? `${log.admin.first_name} ${log.admin.last_name}`
                                    : log.admin.username
                                : "administrador";
                            return (
                                <UserRow
                                    key={log.id}
                                    name={
                                        t.first_name && t.last_name
                                            ? `${t.first_name} ${t.last_name}`
                                            : t.username || "Usuario"
                                    }
                                    subtitle={`por ${adminName}`}
                                    time={formatRelativeTime(log.timestamp)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Cursos recientes
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {recentCourses.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            No hay cursos creados.
                        </p>
                    )}
                    {recentCourses.slice(0, 5).map((course) => (
                        <div
                            key={course.id}
                            className="flex items-center gap-4 px-5 py-3.5"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {course.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {course.enrollments_count ?? 0} alumno
                                    {course.enrollments_count !== 1 ? "s" : ""}
                                    {" · "}
                                    {course.visibility === "PUBLIC"
                                        ? "Público"
                                        : "Privado"}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatRelativeTime(course.created_at)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        Actividad reciente
                    </h2>
                    <Link
                        to="/admin/activity"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        Ver toda la actividad →
                    </Link>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {recentActivity.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            No hay actividad registrada.
                        </p>
                    )}
                    {recentActivity.slice(0, 5).map((log) => {
                        const detail = activityDetailLines(log)
                            .slice(0, 2)
                            .join(" · ");
                        return (
                            <div
                                key={log.id}
                                className="flex items-center gap-4 px-5 py-3.5"
                            >
                                <span
                                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionStyle(log.action)}`}
                                >
                                    {actionLabel(log.action)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {actorName(log)}
                                        {targetName(log)
                                            ? ` → ${targetName(log)}`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {entityTypeLabel(log.entity_type)}
                                        {detail ? ` · ${detail}` : ""}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {formatRelativeTime(log.created_at)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

function TeacherDashboard({ stats }) {
    const courses = stats.courses ?? [];
    const enrollments = stats.enrollments ?? [];

    const studentsCount = courses.reduce(
        (sum, c) => sum + (c.enrollments_count ?? 0), 0
    );
    const pendingCount = enrollments.filter(
        (e) => e.status === "PENDING"
    ).length;

    return (
        <>
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Tu resumen académico
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Cursos"
                        value={courses.length}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                            />
                        }
                        color="indigo"
                    />
                    <StatCard
                        label="Estudiantes"
                        value={studentsCount}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                        }
                        color="emerald"
                    />
                    <StatCard
                        label="Pendientes"
                        value={pendingCount}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        }
                        color="amber"
                    />
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        Actividad reciente
                    </h2>
                    {courses.length > 0 && (
                        <Link
                            to="/courses"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Ver todos →
                        </Link>
                    )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {courses.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            No hay actividad reciente.
                        </p>
                    )}
                    {courses.slice(0, 5).map((course) => (
                        <Link
                            key={course.id}
                            to={`/courses/${course.id}`}
                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {course.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {course.enrollments_count} alumno
                                    {course.enrollments_count !== 1 ? "s" : ""}
                                    {" · "}
                                    {course.visibility === "PUBLIC"
                                        ? "Público"
                                        : "Privado"}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatRelativeTime(course.created_at)}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}

function StudentDashboard({ stats }) {
    const enrollments = stats.enrollments ?? [];
    const grades = stats.grades ?? [];
    const assignments = stats.assignments ?? [];
    const finalScores = stats.final_scores ?? {};

    const approvedCourseIds = useMemo(
        () =>
            new Set(
                enrollments
                    .filter((e) => e.status === "APPROVED")
                    .map((e) => e.course_id)
            ),
        [enrollments]
    );

    const approvedCourses = useMemo(
        () => enrollments.filter((e) => e.status === "APPROVED"),
        [enrollments]
    );

    const gradedAssignmentIds = useMemo(
        () => new Set(grades.map((g) => g.assignment_id).filter(Boolean)),
        [grades]
    );
    const ungradedCount = useMemo(
        () => assignments.filter((a) => !gradedAssignmentIds.has(a.id)).length,
        [assignments, gradedAssignmentIds]
    );

    const recentGrades = useMemo(
        () =>
            [...grades]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5),
        [grades]
    );

    return (
        <>
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Tu resumen
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Mis cursos"
                        value={approvedCourseIds.size}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                            />
                        }
                        color="indigo"
                    />
                    <StatCard
                        label="Asignaciones"
                        value={assignments.length}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                            />
                        }
                        color="emerald"
                    />
                    <StatCard
                        label="Sin calificar"
                        value={ungradedCount}
                        icon={
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        }
                        color="amber"
                    />
                </div>
            </div>

            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Nota final por curso
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {approvedCourses.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            Aún no estás inscrito en ningún curso.
                        </p>
                    )}
                    {approvedCourses.map((course) => {
                        const final = finalScores[String(course.course_id)];
                        return (
                            <div
                                key={course.course_id}
                                className="flex items-center justify-between gap-4 px-5 py-3.5"
                            >
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {course.course_title}
                                </p>
                                <span className="text-lg font-bold text-indigo-700 shrink-0">
                                    {final !== undefined && final !== null
                                        ? `${final}%`
                                        : "—"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        Evaluaciones recientes
                    </h2>
                    {recentGrades.length > 0 && (
                        <Link
                            to="/grades"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Ver todas →
                        </Link>
                    )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {recentGrades.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            Aún no tienes evaluaciones.
                        </p>
                    )}
                    {recentGrades.map((grade) => (
                        <div
                            key={grade.id}
                            className="flex items-center gap-4 px-5 py-3.5"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {grade.assignment_title ?? "Evaluación"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {grade.course_title ?? ""}
                                    {grade.course_title && " · "}
                                    Nota: {grade.score}/{grade.assignment_max_score ?? "?"}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatRelativeTime(grade.created_at)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

const COLOR_MAP = {
    indigo: {
        bg: "bg-indigo-50",
        icon: "bg-indigo-100 text-indigo-600",
    },
    emerald: {
        bg: "bg-emerald-50",
        icon: "bg-emerald-100 text-emerald-600",
    },
    amber: {
        bg: "bg-amber-50",
        icon: "bg-amber-100 text-amber-600",
    },
    sky: {
        bg: "bg-sky-50",
        icon: "bg-sky-100 text-sky-600",
    },
    rose: {
        bg: "bg-rose-50",
        icon: "bg-rose-100 text-rose-600",
    },
};

function StatCard({ label, value, icon, color }) {
    const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.icon}`}
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                >
                    {icon}
                </svg>
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}

function UserRow({ name, subtitle, time }) {
    return (
        <div className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-sm font-semibold">
                {(name?.charAt(0) || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">
                    {name}
                </p>
                <p className="text-xs text-gray-400 truncate">{subtitle}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
                {time}
            </span>
        </div>
    );
}
