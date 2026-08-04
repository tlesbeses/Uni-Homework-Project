import { Link } from "react-router-dom";
import { formatUser } from "@/features/teams/utils/formatUser";

export const TeamCard = ({ team, canManage, onDelete, onEdit, deleting }) => {
    const memberCount = team.members?.length ?? 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                        {team.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Curso: {team.course?.title}
                    </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                    {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
                </span>
            </div>

            <p className="text-sm text-gray-500">Líder: {formatUser(team.leader)}</p>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <Link
                    to={`/teams/${team.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    Ver detalles
                </Link>

                {canManage && (
                    <div className="flex items-center gap-3">
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
