import { useState } from "react";
import { useCourseProgress } from "@/features/courses/hooks/useCourseProgress";
import { Button } from "@/shared/components/ui/Button";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";

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

const progressColumns = [
    {
        key: "title",
        header: "Tarea",
        role: "primary",
        render: (assignment) => (
            <span className="font-medium text-gray-800">
                {assignment.title}
            </span>
        ),
    },
    {
        key: "graded",
        header: "Calificadas",
        role: "secondary",
        render: (assignment) => (
            <span className="text-gray-600">
                {assignment.graded}/{assignment.graded + assignment.pending}
            </span>
        ),
    },
    {
        key: "avg",
        header: "Promedio",
        role: "secondary",
        render: (assignment) => (
            <div className="flex items-center gap-2">
                <ProgressBar value={assignment.avg} />
                <span className="text-xs text-gray-600">
                    {formatScore(assignment.avg)}
                </span>
            </div>
        ),
    },
    {
        key: "max",
        header: "Máx",
        role: "optional",
        render: (assignment) => (
            <span className="text-gray-600">
                {formatScore(assignment.max)}
            </span>
        ),
    },
    {
        key: "min",
        header: "Mín",
        role: "optional",
        render: (assignment) => (
            <span className="text-gray-600">
                {formatScore(assignment.min)}
            </span>
        ),
    },
];

export const CourseProgress = ({ courseId, sectionId }) => {
    const { progress, loading, error } = useCourseProgress(
        courseId,
        sectionId
    );
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
                        por sección · estadísticas por tarea y por estudiante
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
                        {progress?.section_title
                            ? ` · Sección ${progress.section_title}`
                            : ""}
                    </p>
                </div>
                <Button
                    variant="link"
                    size="sm"
                    className="text-xs"
                    onClick={() => setIsOpen(false)}
                >
                    Ocultar ▲
                </Button>
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
                        <ResponsiveDataTable
                            columns={progressColumns}
                            rows={progress.assignments}
                            rowKey={(assignment) => assignment.id}
                            emptyContent="El curso aún no tiene tareas publicadas."
                            ariaLabel="Progreso por tarea"
                        />
                    )}
                </div>
            )}
        </div>
    );
};