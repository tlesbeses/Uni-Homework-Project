import { useState } from "react";
import { useCourseProgress } from "@/features/courses/hooks/useCourseProgress";

const formatScore = (value) =>
    value === null || value === undefined ? "—" : String(Number(value.toFixed(2)));

const StatCard = ({ label, value, suffix = "" }) => (
    <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            {label}
        </p>
        <p className="text-xl font-bold text-gray-800 mt-1">
            {formatScore(value)}
            {suffix && (
                <span className="text-xs font-medium text-gray-400">
                    {" "}
                    {suffix}
                </span>
            )}
        </p>
    </div>
);

const ProgressBar = ({ value }) => {
    const clamped = Math.max(0, Math.min(100, Number(value ?? 0)));
    return (
        <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
};

export const CourseProgress = ({ courseId }) => {
    const { progress, loading, error } = useCourseProgress(courseId);
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-5 py-4 text-left transition hover:bg-indigo-50"
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-indigo-700">
                        Progreso del curso
                    </span>
                    <span className="text-xs text-gray-500">
                        estadísticas por tarea y por estudiante
                    </span>
                </span>
                <span className="text-sm text-indigo-500">▼</span>
            </button>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-gray-300">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                        Progreso del curso
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {progress?.course_title}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                    Ocultar ▲
                </button>
            </div>

            {loading && (
                <p className="text-sm text-gray-500 px-5 py-6">
                    Cargando progreso...
                </p>
            )}
            {!loading && error && (
                <p className="text-sm text-red-500 px-5 py-6">{error}</p>
            )}
            {!loading && !error && progress && (
                <div className="px-5 py-4 space-y-6 print:space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard
                            label="Estudiantes"
                            value={progress.student_count}
                        />
                        <StatCard
                            label="Promedio general"
                            value={progress.overall_avg_final}
                            suffix="%"
                        />
                        <StatCard
                            label="Tareas publicadas"
                            value={progress.assignments.length}
                        />
                    </div>

                    {progress.assignments.length === 0 ? (
                        <p className="text-xs text-gray-500">
                            El curso aún no tiene tareas publicadas.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="py-2 pr-3 font-medium">
                                            Tarea
                                        </th>
                                        <th className="py-2 pr-3 font-medium">
                                            Calificadas
                                        </th>
                                        <th className="py-2 pr-3 font-medium">
                                            Promedio
                                        </th>
                                        <th className="py-2 pr-3 font-medium">
                                            Máx
                                        </th>
                                        <th className="py-2 font-medium">
                                            Mín
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {progress.assignments.map((assignment) => (
                                        <tr
                                            key={assignment.id}
                                            className="border-b border-gray-50 last:border-0"
                                        >
                                            <td className="py-2 pr-3 text-gray-800">
                                                {assignment.title}
                                            </td>
                                            <td className="py-2 pr-3 text-gray-600">
                                                {assignment.graded}/
                                                {assignment.graded +
                                                    assignment.pending}
                                            </td>
                                            <td className="py-2 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <ProgressBar
                                                        value={assignment.avg}
                                                    />
                                                    <span className="text-xs text-gray-600">
                                                        {formatScore(
                                                            assignment.avg
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-3 text-gray-600">
                                                {formatScore(assignment.max)}
                                            </td>
                                            <td className="py-2 text-gray-600">
                                                {formatScore(assignment.min)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};