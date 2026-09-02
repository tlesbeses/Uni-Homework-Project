import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    changeTeamLeader,
    getTeam,
    removeTeamMember,
} from "@/features/teams/services/teamService";
import { queryKeys, invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useTeamDetail = (teamId) => {
    const queryClient = useQueryClient();
    const [removingId, setRemovingId] = useState(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.teams.detail(teamId),
        queryFn: () => getTeam(teamId),
        enabled: Boolean(teamId),
    });

    const removeMutation = useMutation({
        mutationFn: (studentId) => removeTeamMember(teamId, studentId),
        onMutate: (studentId) => {
            setRemovingId(studentId);
        },
        onSuccess: () => {
            toast.success("Estudiante eliminado del equipo");
            invalidateScope(queryClient, "teams");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
        onSettled: () => {
            setRemovingId(null);
        },
    });

    const leaderMutation = useMutation({
        mutationFn: (studentId) => changeTeamLeader(teamId, studentId),
        onSuccess: () => {
            toast.success("Líder del equipo actualizado");
            invalidateScope(queryClient, "teams");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });

    return {
        team: data,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => refetch(),
        handleRemoveMember: (studentId) => removeMutation.mutateAsync(studentId),
        removingId,
        handleChangeLeader: (studentId) => leaderMutation.mutateAsync(studentId),
    };
};
