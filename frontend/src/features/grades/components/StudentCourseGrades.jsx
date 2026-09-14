import { useMemo, useState } from "react";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useDashboard } from "@/features/courses/hooks/useDashboard";
import { EvolutionChart } from "@/features/grades/components/EvolutionChart";
import { useGradeEvolution } from "@/features/grades/hooks/useGradeEvolution";
import { Button } from "@/shared/components/ui/Button";

const formatPoints = (value) => String(Number(value.toFixed(2)));

const BREAKDOWN_LABELS = {
    ACUMULADO: "Acum.",
    EXAMEN: "Exam.",
    PRIMERO: "P1",
    SEGUNDO: "P2",
};

const formatBreakdown = (components) =>
    (components ?? [])
        .map(
            (c) =>
                `${c.pct}% ${
                    BREAKDOWN_LABELS[c.type] ?? c.type
                } ${BREAKDOWN_LABELS[c.parcial] ?? c.parcial} (${
                    c.average === null ? "—" : `${c.average}%`
                })`
        )
        .join(" + ");

const PARCIAL_LABELS = { PRIMERO: "Parcial 1", SEGUNDO: "Parcial 2" };

const parseAssignmentBadge = (assignment) => {
    const category = assignment?.category === "EXAMEN" ? "Exam." : "Acum.";
    const parcial = PARCIAL_LABELS[assignment?.parcial];
    if (!assignment?.category || !parcial) {
        return "";
    }
    return `${category} ${parcial}`;
};

const GradeRow = ({ grade }) => {
    const badge = parseAssignmentBadge(grade.assignment);
    return (
        <li className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                    {grade.assignment.title}
                </p>
                {badge && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 text-[11px] font-medium mt-1">
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm font-bold text-indigo-700 shrink-0 pt-0.5">
                {grade.score} / {grade.assignment.max_score}
            </p>
        </li>
    );
};

const formatParcialScores = (scores) =>
    Object.entries(scores ?? {})
        .map(([key, value]) => [
            PARCIAL_LABELS[key] ?? key,
            value === null ? "—" : `${value}%`,
        ])
        .map(([label, value]) => `${label}: ${value}`)
        .join(" · ");

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
    const finalBreakdowns = dashboard?.final_breakdowns ?? {};
    const parcialScores = dashboard?.parcial_scores ?? {};
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
                            className={`w-full flex flex-col gap-3 px-5 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
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

                            <span className="w-full text-left sm:w-auto sm:shrink-0 sm:text-right">
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
                                {parcialScores[
                                    `${group.course.id}`
                                ] && (
                                    <span className="block text-[11px] font-semibold text-indigo-600 mt-0.5">
                                        {formatParcialScores(
                                            parcialScores[
                                                `${group.course.id}`
                                            ]
                                        )}
                                    </span>
                                )}
                                {finalBreakdowns[`${group.course.id}`]
                                    ?.length > 0 && (
                                        <span className="block text-[10px] text-gray-400 mt-0.5 leading-snug break-words">
                                            {formatBreakdown(
                                                finalBreakdowns[
                                                    `${group.course.id}`
                                                ]
                                            )}
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
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="px-0"
                                        onClick={() =>
                                            toggleEvolution(group.course.id)
                                        }
                                    >
                                        {evolutionId === group.course.id
                                            ? "Ocultar evolución de mi nota final ▲"
                                            : "Ver evolución de mi nota final ▼"}
                                    </Button>
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
