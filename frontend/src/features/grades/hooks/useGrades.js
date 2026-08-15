import { useCallback } from "react";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";
import { getGrades } from "@/features/grades/services/gradeService";

export const useGrades = () => {
    const fetchGrades = useCallback(async () => {
        const data = await getGrades();
        return data.results ?? data;
    }, []);

    const { data, loading, error, reload } = useAsyncData(fetchGrades);

    return {
        grades: data ?? [],
        loading,
        error,
        reload,
    };
};
