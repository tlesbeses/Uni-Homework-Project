import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { getCourses } from "@/features/courses/services/courseService";
import { getEnrollments } from "@/features/courses/services/courseService";
import { getGrades } from "@/features/grades/services/gradeService";
import { getAssignments } from "@/features/assignments/services/assignmentService";

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
    const { user, isTeacher, isStudent } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchDashboardData() {
            setLoading(true);
            try {
                if (isTeacher) {
                    const data = await fetchTeacherStats();
                    if (!cancelled) { setStats(data); }
                } else if (isStudent) {
                    const data = await fetchStudentStats();
                    if (!cancelled) { setStats(data); }
                } else {
                    if (!cancelled) { setStats({ type: "empty" }); }
                }
            } catch {
                // Silently handle dashboard fetch errors
            } finally {
                if (!cancelled) { setLoading(false); }
            }
        }

        fetchDashboardData();
        return () => {
            cancelled = true;
        };
    }, [isTeacher, isStudent]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    const userName = user?.first_name || user?.username || "";

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

            {isTeacher && stats?.type === "teacher" && (
                <TeacherDashboard stats={stats} />
            )}

            {isStudent && stats?.type === "student" && (
                <StudentDashboard stats={stats} />
            )}

            {(!isTeacher && !isStudent) && (
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

async function fetchTeacherStats() {
    const [coursesRes, enrollmentsRes] = await Promise.all([
        getCourses({ page: 1, page_size: 100 }),
        getEnrollments(null, { page: 1, page_size: 100 }),
    ]);

    const courses = Array.isArray(coursesRes)
        ? coursesRes
        : coursesRes?.results ?? [];
    const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes?.results ?? [];

    const studentsCount = courses.reduce(
        (sum, c) => sum + (c.enrollments_count ?? 0), 0
    );
    const pendingCount = enrollments.filter(
        (e) => e.status === "PENDING"
    ).length;
    const recentCourses = [...courses]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    return {
        type: "teacher",
        coursesCount: courses.length,
        studentsCount,
        pendingCount,
        recentCourses,
    };
}

async function fetchStudentStats() {
    const [enrollmentsRes, gradesRes, assignmentsRes] = await Promise.all([
        getEnrollments(null, { page: 1, page_size: 100 }),
        getGrades({ page: 1, page_size: 100 }),
        getAssignments({ page: 1, page_size: 100 }),
    ]);

    const enrollments = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes?.results ?? [];
    const grades = Array.isArray(gradesRes)
        ? gradesRes
        : gradesRes?.results ?? [];
    const assignments = Array.isArray(assignmentsRes)
        ? assignmentsRes
        : assignmentsRes?.results ?? [];

    const approvedEnrollments = enrollments.filter(
        (e) => e.status === "APPROVED"
    );
    const enrolledCourseIds = new Set(
        approvedEnrollments.map((e) => e.section?.course?.id).filter(Boolean)
    );

    const gradedAssignmentIds = new Set(
        grades.map((g) => g.assignment?.id).filter(Boolean)
    );
    const ungradedCount = assignments.filter(
        (a) => !gradedAssignmentIds.has(a.id)
    ).length;

    const recentGrades = [...grades]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    return {
        type: "student",
        enrolledCount: enrolledCourseIds.size,
        assignmentsCount: assignments.length,
        ungradedCount,
        recentGrades,
    };
}

function TeacherDashboard({ stats }) {
    return (
        <>
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Tu resumen académico
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Cursos"
                        value={stats.coursesCount}
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
                        value={stats.studentsCount}
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
                        value={stats.pendingCount}
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
                    {stats.coursesCount > 0 && (
                        <Link
                            to="/courses"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Ver todos →
                        </Link>
                    )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {stats.recentCourses.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            No hay actividad reciente.
                        </p>
                    )}
                    {stats.recentCourses.map((course) => (
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
    return (
        <>
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Tu resumen
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Mis cursos"
                        value={stats.enrolledCount}
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
                        value={stats.assignmentsCount}
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
                        value={stats.ungradedCount}
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
                        Evaluaciones recientes
                    </h2>
                    {stats.recentGrades.length > 0 && (
                        <Link
                            to="/grades"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Ver todas →
                        </Link>
                    )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {stats.recentGrades.length === 0 && (
                        <p className="px-5 py-8 text-center text-gray-400 text-sm">
                            Aún no tienes evaluaciones.
                        </p>
                    )}
                    {stats.recentGrades.map((grade) => (
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
                                    {grade.assignment?.title ?? "Evaluación"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {grade.assignment?.course?.title ?? ""}
                                    {grade.assignment?.course?.title && " · "}
                                    Nota: {grade.score}/{grade.assignment?.max_score ?? "?"}
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
