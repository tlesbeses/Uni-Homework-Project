export const CourseDetailHeader = ({ course, teacher, isOwner, onEdit }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {course.title}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Profesor: {course.teacher?.username}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                        {course.visibility === "PUBLIC" ? "Público" : "Privado"}
                    </span>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Editar
                        </button>
                    )}
                </div>
            </div>

            {course.description && (
                <p className="mt-3 text-gray-600">{course.description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>{course.enrollments_count} alumnos inscritos</span>
                {teacher && course.join_code && (
                    <span className="font-mono font-semibold tracking-widest text-indigo-600 bg-gray-50 px-2 py-1 rounded">
                        Código: {course.join_code}
                    </span>
                )}
            </div>
        </div>
    );
};
