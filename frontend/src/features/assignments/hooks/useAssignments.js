import { useCallback } from "react";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";
import { getCourseAssignments } from "@/features/assignments/services/assignmentService";

export const useAssignments = (courseId) => {
    const fetchAssignments = useCallback(
        () => getCourseAssignments(courseId),
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
