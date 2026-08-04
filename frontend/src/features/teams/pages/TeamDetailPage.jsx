import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useTeamDetail } from "@/features/teams/hooks/useTeamDetail";
import { MemberList } from "@/features/teams/components/MemberList";
import { AddMemberModal } from "@/features/teams/components/AddMemberModal";
import { formatUser } from "@/features/teams/utils/formatUser";
import { isTeacher } from "@/shared/untils/roles";

export const TeamDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const teacher = isTeacher(user);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const {
        team,
        enrollments,
        loading,
        error,
        reload,
        handleRemoveMember,
        removingId,
        handleChangeLeader,
    } = useTeamDetail(id);

    if (loading) {
        return <p className="text-gray-500">Cargando equipo...</p>;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!team) {
        return <p className="text-gray-500">Equipo no encontrado.</p>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <Link
                to="/teams"
                className="text-sm text-indigo-600 hover:text-indigo-800"
            >
                &larr; Volver a equipos
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {team.name}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Curso: {team.course?.title}
                        </p>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                        Líder: {formatUser(team.leader)}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Miembros
                    </h2>
                    {teacher && (
                        <button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow transition"
                        >
                            + Agregar miembro
                        </button>
                    )}
                </div>

                <MemberList
                    members={team.members}
                    leaderId={team.leader?.id}
                    isTeacher={teacher}
                    onRemove={handleRemoveMember}
                    onMakeLeader={handleChangeLeader}
                    removingId={removingId}
                />
            </div>

            <AddMemberModal
                key={team.id}
                team={team}
                enrollments={enrollments}
                open={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onAdded={async () => {
                    await reload();
                    setIsAddOpen(false);
                }}
            />
        </div>
    );
};
