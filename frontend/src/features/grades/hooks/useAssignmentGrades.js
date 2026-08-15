import { useCallback } from "react";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";
import { getGrades } from "@/features/grades/services/gradeService";

export const useAssignmentGrades = (assignmentId) => {
    const fetchGrades = useCallback(async () => {
        if (!assignmentId) {
            return [];
        }
        const data = await getGrades({ assignment: assignmentId });
        return data.results ?? data;
    }, [assignmentId]);

    const { data, loading, error, reload } = useAsyncData(fetchGrades);

    return {
        grades: data ?? [],
        loading,
        error,
        reload,
    };
};
