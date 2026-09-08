import { useMemo, useState } from "react";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useDashboard } from "@/features/courses/hooks/useDashboard";
import { EvolutionChart } from "@/features/grades/components/EvolutionChart";
import { useGradeEvolution } from "@/features/grades/hooks/useGradeEvolution";

const formatPoints = (value) => String(Number(value.toFixed(2)));

const formatGradedBy = (gradedBy) =>
    `${gradedBy?.first_name || (gradedBy?.username ?? "")} ${
        gradedBy?.last_name ?? ""
    }`.trim();

const GradeRow = ({ grade }) => (
    <li className="py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 mt-0.5">
                {grade.assignment.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
                Evaluada por: {formatGradedBy(grade.graded_by)}
            </p>
        </div>
        <p className="text-sm font-bold text-indigo-700 shrink-0 pt-0.5">
            {grade.score} / {grade.assignment.max_score}
        </p>
    </li>
);

const EvolutionSeries = ({ courseId }) => {
    const { points, loading, error } = useGradeEvolution(courseId);

    return (
        <div className="pt-3">
            <p className="text-xs text-gray-500 mb-1">
                Evolución de tu nota final (0-100%):
            </p>
            {loading && (
                <p className="text-xs text-gray-500 py-4 text-center">
                    Cargando evolución...
                </p>
            )}
            {!loading && error && (
                <p className="text-xs text-red-500 py-4 text-center">
                    No se pudo cargar la evolución.
                </p>
            )}
            {!loading && !error && <EvolutionChart points={points} />}
        </div>
    );
};

export const StudentCourseGrades = () => {
    const { grades, loading, error } = useGrades();
    const { stats: dashboard } = useDashboard();
    const finalScores = dashboard?.final_scores ?? {};
    const [expandedKey, setExpandedKey] = useState(null);
    const [evolutionId, setEvolutionId] = useState(null);

    const groups = useMemo(() => {
        const byCourse = new Map();
        (grades ?? []).forEach((grade) => {
            const course = grade.assignment?.course;
            if (!course) {
                return;
            }
            const key = String(course.id);
            if (!byCourse.has(key)) {
                byCourse.set(key, {
                    course,
                    grades: [],
                    totalScore: 0,
                    totalMax: 0,
                });
            }
            const entry = byCourse.get(key);
            entry.grades.push(grade);
            entry.totalScore += Number(grade.score ?? 0);
            entry.totalMax += Number(grade.assignment.max_score ?? 0);
        });
        return [...byCourse.values()];
    }, [grades]);

    const toggle = (key) =>
        setExpandedKey((current) => (current === key ? null : key));

    const toggleEvolution = (courseId) =>
        setEvolutionId((current) =>
            current === courseId ? null : courseId
        );

    if (loading) {
        return (
            <p className="text-sm text-gray-500">Cargando evaluaciones...</p>
        );
    }

    if (error) {
        return <p className="text-sm text-red-500">{error}</p>;
    }

    if (groups.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm text-gray-500">
                    Aún no tienes evaluaciones.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                    Imprimir / PDF
                </button>
            </div>
            {groups.map((group) => {
                const key = `c:${group.course.id}`;
                const isOpen = expandedKey === key;

                return (
                    <div
                        key={group.course.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => toggle(key)}
                            className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition ${
                                isOpen ? "bg-indigo-50/60" : "hover:bg-gray-50"
                            }`}
                        >
                            <span className="flex items-center gap-3 min-w-0">
                                <span
                                    aria-hidden
                                    className="w-9 h-9 rounded-full bg-indigo-100 grid place-items-center shrink-0"
                                >
                                    📚
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-800 truncate">
                                        {group.course.title}
                                    </span>
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        {group.grades.length}{" "}
                                        asignació
                                        {group.grades.length === 1
                                            ? "n evaluada"
                                            : "nes evaluadas"}
                                    </span>
                                </span>
                            </span>

                            <span className="shrink-0 text-right">
                                <span className="block text-lg font-bold text-indigo-700 leading-tight">
                                    {formatPoints(group.totalScore)}
                                    <span className="text-xs font-medium text-gray-400">
                                        {" "}
                                        / {formatPoints(group.totalMax)} pts
                                    </span>
                                </span>
                                {finalScores[`${group.course.id}`] !==
                                    undefined &&
                                    finalScores[`${group.course.id}`] !==
                                        null && (
                                        <span className="block text-[11px] font-semibold text-emerald-600 mt-0.5">
                                            Nota final:{" "}
                                            {finalScores[`${group.course.id}`]}
                                            %
                                        </span>
                                    )}
                                <span className="block text-[11px] text-gray-400 mt-0.5">
                                    Suma de tus notas
                                    {isOpen ? " ▲" : " ▼"}
                                </span>
                            </span>
                        </button>

                        {isOpen && (
                            <>
                                <ul className="divide-y divide-gray-100 border-t border-gray-100 px-5 pb-1">
                                    {group.grades.map((grade) => (
                                        <GradeRow
                                            key={grade.id}
                                            grade={grade}
                                        />
                                    ))}
                                </ul>
                                <div className="border-t border-gray-100 px-5 py-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleEvolution(group.course.id)
                                        }
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        {evolutionId === group.course.id
                                            ? "Ocultar evolución de mi nota final ▲"
                                            : "Ver evolución de mi nota final ▼"}
                                    </button>
                                    {evolutionId === group.course.id && (
                                        <EvolutionSeries
                                            courseId={group.course.id}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
