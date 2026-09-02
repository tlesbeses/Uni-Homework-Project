import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteTeam } from "@/features/teams/services/teamService";
import { invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useDeleteTeam = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTeam,
        onSuccess: () => {
            toast.success("Equipo eliminado");
            invalidateScope(queryClient, "teams");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });
};
