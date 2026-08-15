import { useCallback } from "react";
import { useAllData } from "@/features/courses/hooks/useAllData";
import { getGrades } from "@/features/grades/services/gradeService";

export const useGrades = () => {
    const fetchAll = useCallback((params) => getGrades(params), []);

    const { data, loading, error, reload } = useAllData(fetchAll);

    return {
        grades: data ?? [],
        loading,
        error,
        reload,
    };
};
