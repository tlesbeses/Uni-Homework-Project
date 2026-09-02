import { useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getCourses } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const PAGE_SIZE = 9;

export const usePaginatedCourses = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.courses.list({ page, page_size: PAGE_SIZE }),
        queryFn: () =>
            getCourses({ page, page_size: PAGE_SIZE }).then((data) => {
                const items = Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data)
                      ? data
                      : [];
                const count =
                    typeof data.count === "number" ? data.count : items.length;
                return { items, count };
            }),
        // Mantiene visible la página anterior al navegar, sin spinner.
        placeholderData: keepPreviousData,
    });

    const courses = data?.items ?? [];
    const count = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

    const reload = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
        return refetch();
    };

    return {
        courses,
        page,
        totalPages,
        setPage,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload,
    };
};
