import { Link } from "react-router-dom";
import { GradeOriginBadge } from "@/features/grades/components/GradeOriginBadge";
import { useGrades } from "@/features/grades/hooks/useGrades";

export const StudentGradesList = () => {
    const { grades, loading, error } = useGrades();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {loading && (
                <p className="text-sm text-gray-500">Cargando calificaciones...</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !error && (grades ?? []).length === 0 && (
                <p className="text-sm text-gray-500">
                    Aún no tienes calificaciones.
                </p>
            )}

            {!loading && !error && (grades ?? []).length > 0 && (
                <ul className="divide-y divide-gray-100">
                    {(grades ?? []).map((grade) => (
                        <li
                            key={grade.id}
                            className="py-4 flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <Link
                                    to={`/courses/${grade.assignment.course.id}`}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    {grade.assignment.course.title}
                                </Link>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <p className="text-sm font-medium text-gray-800">
                                        {grade.assignment.title}
                                    </p>
                                    <GradeOriginBadge
                                        isIndividual={grade.is_individual}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Calificada por: {grade.graded_by.first_name || grade.graded_by.username}
                                </p>
                            </div>
                            <p className="text-lg font-bold text-indigo-700 shrink-0">
                                {grade.score} / {grade.assignment.max_score}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
