import { useCallback } from "react";
import { useAllData } from "@/shared/hooks/useAllData";
import { getAssignments } from "@/features/assignments/services/assignmentService";

export const useAllAssignments = () => {
    const fetchAll = useCallback((params) => getAssignments(params), []);

    const { data, loading, error, reload } = useAllData(fetchAll);

    return {
        assignments: data ?? [],
        loading,
        error,
        reload,
    };
};
