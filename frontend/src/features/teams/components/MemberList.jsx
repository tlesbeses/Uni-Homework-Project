import { formatUser } from "@/features/teams/utils/formatUser";
import { Button } from "@/shared/components/ui/Button";

export const MemberList = ({
    members,
    leaderId,
    canManage,
    onRemove,
    onMakeLeader,
    removingId,
}) => {
    if ((members ?? []).length === 0) {
        return (
            <p className="text-sm text-gray-500">
                Aún no hay miembros en este equipo.
            </p>
        );
    }

    return (
        <ul className="divide-y divide-gray-100">
            {(members ?? []).map((member) => {
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

                        {canManage && !isLeader && (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onMakeLeader(member.student.id)}
                                >
                                    Hacer líder
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => onRemove(member.student.id)}
                                    disabled={busy}
                                >
                                    {busy ? "Quitando..." : "Quitar"}
                                </Button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
