import { useCallback } from "react";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { getCourseAssignments } from "@/features/assignments/services/assignmentService";

export const useAssignments = (courseId) => {
    const fetchAssignments = useCallback(
        (opts) => getCourseAssignments(courseId, opts),
        [courseId]
    );

    const { data, loading, error, reload } = useAsyncData(fetchAssignments);

    return {
        assignments: data ?? [],
        loading,
        error,
        reload,
    };
};
