import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    useGradeStudent,
    useGradeTeam,
} from "@/features/grades/hooks/useGradeMutations";
import {
    gradeStudent,
    gradeTeam,
} from "@/features/grades/services/gradeService";

vi.mock("@/features/grades/services/gradeService", () => ({
    gradeTeam: vi.fn(),
    gradeStudent: vi.fn(),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return {
        queryClient,
        wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        ),
    };
}

describe("useGradeTeam", () => {
    it("califica al equipo pasando overwrite_individual e invalida notas", async () => {
        gradeTeam.mockResolvedValue([{ id: 1, score: 7.5 }]);
        const { wrapper, queryClient } = createWrapper();
        const spy = vi
            .spyOn(queryClient, "invalidateQueries")
            .mockImplementation(() => {});

        const { result } = renderHook(() => useGradeTeam(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                assignmentId: 5,
                teamId: 9,
                score: 7.5,
                overwriteIndividual: true,
            });
        });

        expect(gradeTeam).toHaveBeenCalledWith(5, 9, 7.5, {
            overwrite_individual: true,
        });
        expect(spy).toHaveBeenCalledWith({ queryKey: ["grades"] });
    });

    it("no requiere overwrite_individual si no se informa", async () => {
        gradeTeam.mockResolvedValue([{ id: 2, score: 6 }]);
        const { wrapper } = createWrapper();
        const { result } = renderHook(() => useGradeTeam(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                assignmentId: 5,
                teamId: 9,
                score: 6,
            });
        });

        expect(gradeTeam).toHaveBeenCalledWith(5, 9, 6, {
            overwrite_individual: undefined,
        });
    });
});

describe("useGradeStudent", () => {
    it("califica al estudiante e invalida notas", async () => {
        gradeStudent.mockResolvedValue({ id: 7, score: 8 });
        const { wrapper, queryClient } = createWrapper();
        const spy = vi
            .spyOn(queryClient, "invalidateQueries")
            .mockImplementation(() => {});

        const { result } = renderHook(() => useGradeStudent(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                assignmentId: 5,
                studentId: 7,
                score: 8,
            });
        });

        expect(gradeStudent).toHaveBeenCalledWith(5, 7, 8);
        expect(spy).toHaveBeenCalledWith({ queryKey: ["grades"] });
    });
});