import { Link } from "react-router-dom";

export const CourseCard = ({ course, isTeacher, onDelete, deleting }) => {
    const teacherName = course.teacher?.username ?? "Desconocido";

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                        {course.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Profesor: {teacherName}
                    </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                    {course.visibility === "PUBLIC" ? "Público" : "Privado"}
                </span>
            </div>

            {course.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                    {course.description}
                </p>
            )}

            <p className="text-sm text-gray-500">
                {course.enrollments_count} alumnos
            </p>

            {course.join_code && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-500">Código:</span>
                    <span className="font-mono font-semibold tracking-widest text-indigo-600">
                        {course.join_code}
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <Link
                    to={`/courses/${course.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    Ver detalles
                </Link>

                {isTeacher && (
                    <button
                        type="button"
                        onClick={() => onDelete(course.id)}
                        disabled={deleting}
                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                        Eliminar
                    </button>
                )}
            </div>
        </div>
    );
};
