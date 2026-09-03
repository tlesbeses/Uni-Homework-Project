import { useQuery } from "@tanstack/react-query";
import { getCourseAssignments } from "@/features/assignments/services/assignmentService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useAssignments = (courseId) => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.assignments.byCourse(courseId),
        queryFn: () => getCourseAssignments(courseId),
        enabled: Boolean(courseId),
    });

    return {
        assignments: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => refetch(),
    };
};
