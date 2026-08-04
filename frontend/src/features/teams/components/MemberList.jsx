import { formatUser } from "@/features/teams/utils/formatUser";

export const MemberList = ({
    members,
    leaderId,
    isTeacher,
    onRemove,
    onMakeLeader,
    removingId,
}) => {
    if (members.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                Aún no hay miembros en este equipo.
            </p>
        );
    }

    return (
        <ul className="divide-y divide-gray-100">
            {members.map((member) => {
                const isLeader = member.student.id === leaderId;
                const busy = removingId === member.student.id;

                return (
                    <li
                        key={member.id}
                        className="py-3 flex items-center justify-between gap-3"
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-800">
                                {formatUser(member.student)}
                            </p>
                            {isLeader && (
                                <span className="text-xs font-semibold text-amber-600">
                                    Líder
                                </span>
                            )}
                        </div>

                        {isTeacher && !isLeader && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onMakeLeader(member.student.id)}
                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                >
                                    Hacer líder
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRemove(member.student.id)}
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                                >
                                    {busy ? "Quitando..." : "Quitar"}
                                </button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
