import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCourse } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCourse = (courseId) => {
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.courses.detail(courseId),
        queryFn: () => getCourse(courseId),
        enabled: Boolean(courseId),
        // Re-sincroniza el detalle del curso cada 30s (solo pestaña enfocada).
        refetchInterval: 30_000,
    });

    // Escritura optimista en el cache de TanStack: mantiene la misma API que
    // el hook anterior (updateCourse) pero ahora fluye a través del queryCache.
    const updateCourse = useCallback(
        (updater) => {
            queryClient.setQueryData(
                queryKeys.courses.detail(courseId),
                (prev) =>
                    typeof updater === "function" ? updater(prev) : updater
            );
        },
        [queryClient, courseId]
    );

    return {
        course: data,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => refetch(),
        updateCourse,
    };
};
