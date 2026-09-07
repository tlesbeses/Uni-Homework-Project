import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    useDeleteCourse,
    useToggleCourseActive,
} from "@/features/courses/hooks/useCourseMutations";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const { courseServiceMock } = vi.hoisted(() => ({
    courseServiceMock: {
        updateCourse: vi.fn(),
        deleteCourse: vi.fn(),
    },
}));

const { invalidateScopeMock } = vi.hoisted(() => ({
    invalidateScopeMock: vi.fn(),
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/courses/services/courseService", () => courseServiceMock);
vi.mock("@/lib/queryKeys", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, invalidateScope: invalidateScopeMock };
});

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    courseServiceMock.updateCourse.mockReset();
    courseServiceMock.deleteCourse.mockReset();
    invalidateScopeMock.mockReset();
});

describe("useToggleCourseActive", () => {
    it("archiva un curso, avisa e invalida la caché", async () => {
        courseServiceMock.updateCourse.mockResolvedValue({ id: 1 });
        const { result } = renderHook(() => useToggleCourseActive(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.mutateAsync({
                courseId: 1,
                isActive: false,
            });
        });

        expect(courseServiceMock.updateCourse).toHaveBeenCalledWith(1, {
            is_active: false,
        });
        expect(toastMock.success).toHaveBeenCalledWith("Curso archivado");
        expect(invalidateScopeMock).toHaveBeenCalledWith(
            expect.anything(),
            "courses"
        );
    });

    it("restaura un curso y avisa", async () => {
        courseServiceMock.updateCourse.mockResolvedValue({ id: 1 });
        const { result } = renderHook(() => useToggleCourseActive(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.mutateAsync({
                courseId: 1,
                isActive: true,
            });
        });

        expect(courseServiceMock.updateCourse).toHaveBeenCalledWith(1, {
            is_active: true,
        });
        expect(toastMock.success).toHaveBeenCalledWith("Curso restaurado");
        expect(invalidateScopeMock).toHaveBeenCalledWith(
            expect.anything(),
            "courses"
        );
    });

    it("si falla, avisa el error", async () => {
        courseServiceMock.updateCourse.mockRejectedValue({
            response: { status: 403, data: { detail: "Sin permiso" } },
        });
        const { result } = renderHook(() => useToggleCourseActive(), {
            wrapper: createWrapper(),
        });

        act(() => {
            result.current.mutate({ courseId: 1, isActive: false });
        });

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith("Sin permiso")
        );
    });
});

describe("useDeleteCourse", () => {
    it("borra un curso, avisa e invalida la caché", async () => {
        courseServiceMock.deleteCourse.mockResolvedValue({});
        const { result } = renderHook(() => useDeleteCourse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.mutateAsync(1);
        });

        expect(courseServiceMock.deleteCourse).toHaveBeenCalledWith(
            1,
            expect.anything()
        );
        expect(toastMock.success).toHaveBeenCalledWith("Curso eliminado");
        expect(invalidateScopeMock).toHaveBeenCalledWith(
            expect.anything(),
            "courses"
        );
    });
});