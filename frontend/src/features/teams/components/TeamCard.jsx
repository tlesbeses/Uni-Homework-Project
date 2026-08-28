import { Link, useNavigate } from "react-router-dom";
import { formatUser } from "@/features/teams/utils/formatUser";

export const TeamCard = ({
  team,
  canManage,
  onDelete,
  onEdit,
  deleting,
  roleLabel,
}) => {
  const navigate = useNavigate();
  const memberCount = team.members?.length ?? 0;

  return (
    <div
      onClick={() => navigate(`/teams/${team.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/teams/${team.id}`);
        }
      }}
      role="button"
      tabIndex={0}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{team.name}</h3>
          <p className="text-sm text-gray-500">
            {team.section?.course?.title ?? "Curso"}
            {team.section?.name && (
              <span className="font-medium text-indigo-600">
                {" "}
                · {team.section.name}
              </span>
            )}
          </p>
        </div>
        <span className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
            {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
          </span>
          {roleLabel && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                roleLabel === "Líder"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {roleLabel}
            </span>
          )}
        </span>
      </div>

      <p className="text-sm text-gray-500">Líder: {formatUser(team.leader)}</p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <Link
          to={`/teams/${team.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Configuración y miembros
        </Link>

        {canManage && (
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(team)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(team.id)}
              disabled={deleting}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
