import { useQuery } from "@tanstack/react-query";
import { getCourseProgress } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";

export const useCourseProgress = (courseId) => {
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.courses.progress(courseId),
        queryFn: ({ signal }) => getCourseProgress(courseId, signal),
        enabled: Boolean(courseId),
    });

    return {
        progress: data ?? null,
        loading: isLoading,
        error: error ? error.message : "",
    };
};