import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeams } from "@/features/teams/services/teamService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useTeams = () => {
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.teams.list({ all: true }),
        queryFn: () =>
            getTeams({ page_size: 100 }).then((data) =>
                Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data)
                      ? data
                      : []
            ),
    });

    const loadTeams = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
        return refetch();
    };

    return {
        teams: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        loadTeams,
    };
};
