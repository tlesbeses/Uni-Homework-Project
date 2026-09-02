import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gradeStudent, gradeTeam } from "@/features/grades/services/gradeService";
import { invalidateScope } from "@/lib/queryKeys";

export const useGradeTeam = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ assignmentId, teamId, score, overwriteIndividual }) =>
            gradeTeam(assignmentId, teamId, score, {
                overwrite_individual: overwriteIndividual,
            }),
        onSuccess: () => {
            invalidateScope(queryClient, "grades");
        },
    });
};

export const useGradeStudent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ assignmentId, studentId, score }) =>
            gradeStudent(assignmentId, studentId, score),
        onSuccess: () => {
            invalidateScope(queryClient, "grades");
        },
    });
};
