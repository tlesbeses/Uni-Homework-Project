import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGrades } from "@/features/grades/services/gradeService";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAllPages } from "@/shared/utils/fetchAllPages";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useGrades = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.grades.list({ all: true }),
        queryFn: () => fetchAllPages(getGrades),
    });

    return {
        grades: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.grades.all });
            return refetch();
        },
    };
};
