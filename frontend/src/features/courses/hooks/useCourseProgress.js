import { useQuery } from "@tanstack/react-query";
import { getCourseProgress } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";

export const useCourseProgress = (courseId, sectionId) => {
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.courses.progress(courseId, sectionId),
        queryFn: ({ signal }) =>
            getCourseProgress(courseId, { signal, sectionId }),
        enabled: Boolean(courseId),
    });

    return {
        progress: data ?? null,
        loading: isLoading,
        error: error ? error.message : "",
    };
};