import { useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getCourses } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 9;

export const usePaginatedCourses = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.courses.list({ page, page_size: pageSize }),
        queryFn: () =>
            getCourses({ page, page_size: pageSize }).then((data) => {
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
        // Re-sincroniza la lista de cursos cada 30s (solo pestaña enfocada),
        // para que los cambios de otros usuarios (p. ej. visibilidad) se reflejen sin recargar.
        refetchInterval: 30_000,
    });

    const courses = data?.items ?? [];
    const count = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const reload = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
        return refetch();
    };

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        courses,
        page,
        totalPages,
        setPage,
        pageSize,
        handlePageSizeChange,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload,
    };
};
