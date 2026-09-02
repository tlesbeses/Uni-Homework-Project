import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCourses } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAllPages } from "@/shared/utils/fetchAllPages";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCourses = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.courses.list({ all: true }),
        queryFn: () => fetchAllPages(getCourses),
    });

    return {
        courses: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        loadCourses: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            return refetch();
        },
    };
};
