import { Link, useNavigate } from "react-router-dom";
import { KebabMenu } from "@/shared/components/ui/KebabMenu";

export const CourseCard = ({
  course,
  isTeacher,
  isStudent,
  onDelete,
  onEdit,
  onEnroll,
  onToggleActive,
  deleting,
  togglingActive,
}) => {
  const navigate = useNavigate();
  const teacherName = course.teacher
    ? `${course.teacher.first_name} ${course.teacher.last_name}`
    : "Desconocido";

  const menuItems = [
    ...(isStudent
      ? [
          {
            label: "Crear Equipo",
            onClick: () => onEnroll?.(course.id),
            className: "text-green-600 hover:text-green-800",
          },
        ]
      : []),
    ...(isTeacher
      ? [
          {
            label: "Editar",
            onClick: () => onEdit(course),
            className: "text-indigo-600 hover:text-indigo-800",
          },
          {
            label: course.is_active ? "Archivar" : "Restaurar",
            onClick: () => onToggleActive?.(course),
            disabled: togglingActive,
            className: course.is_active
              ? "text-amber-600 hover:text-amber-800"
              : "text-emerald-600 hover:text-emerald-800",
          },
          {
            label: "Eliminar",
            onClick: () => onDelete(course.id),
            disabled: deleting,
            className: "text-red-600 hover:text-red-800",
          },
        ]
      : []),
  ];

  return (
    <div
      onClick={() => navigate(`/courses/${course.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/courses/${course.id}`);
        }
      }}
      role="button"
      tabIndex={0}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {course.title}
          </h3>
          <p className="text-sm text-gray-500">Profesor: {teacherName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
            {course.visibility === "PUBLIC" ? "Público" : "Privado"}
          </span>
          {course.is_active === false && (
            <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-500">
              Archivado
            </span>
          )}
        </div>
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

        {(isTeacher || isStudent) && (
          <div onClick={(e) => e.stopPropagation()}>
            <KebabMenu items={menuItems} />
          </div>
        )}
      </div>
    </div>
  );
};
