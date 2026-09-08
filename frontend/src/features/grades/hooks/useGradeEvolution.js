import { useQuery } from "@tanstack/react-query";
import { getGradeEvolution } from "@/features/grades/services/gradeService";
import { queryKeys } from "@/lib/queryKeys";

export const useGradeEvolution = (courseId) => {
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.grades.evolution(courseId),
        queryFn: ({ signal }) => getGradeEvolution(courseId, signal),
        enabled: Boolean(courseId),
    });

    return {
        points: data?.points ?? [],
        course: data?.course ?? null,
        loading: isLoading,
        error: error ? error.message : "",
    };
};