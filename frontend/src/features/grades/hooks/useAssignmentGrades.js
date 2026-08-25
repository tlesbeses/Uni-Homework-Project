import { useCallback } from "react";
import { useAllData } from "@/shared/hooks/useAllData";
import { getGrades } from "@/features/grades/services/gradeService";

export const useAssignmentGrades = (assignmentId) => {
    const fetchAll = useCallback(
        (params) =>
            assignmentId
                ? getGrades({ assignment: assignmentId, ...params })
                : Promise.resolve([]),
        [assignmentId]
    );

    const { data, loading, error, reload } = useAllData(fetchAll);

    return {
        grades: data ?? [],
        loading,
        error,
        reload,
    };
};
