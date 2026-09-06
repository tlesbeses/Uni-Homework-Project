import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEnrollments } from "@/features/courses/hooks/useEnrollments";
import { useEnrollment } from "@/features/courses/hooks/useEnrollment";
import { useJoinCourseForm } from "@/features/courses/hooks/useJoinEnrollments";

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
        getEnrollments: vi.fn(),
        approveEnrollment: vi.fn(),
        rejectEnrollment: vi.fn(),
        enrollInCourse: vi.fn(),
        joinCourseByCode: vi.fn(),
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
    toastMock.info.mockReset();
    courseServiceMock.getEnrollments.mockReset();
    courseServiceMock.approveEnrollment.mockReset();
    courseServiceMock.rejectEnrollment.mockReset();
    courseServiceMock.enrollInCourse.mockReset();
    courseServiceMock.joinCourseByCode.mockReset();
    invalidateScopeMock.mockReset();

    courseServiceMock.getEnrollments.mockResolvedValue({ results: [] });
});

describe("useEnrollments", () => {
    it("expone la lista de admisiones del curso", async () => {
        courseServiceMock.getEnrollments.mockResolvedValue({
            results: [
                { id: 5, student: { id: 7 }, status: "PENDING" },
            ],
        });

        const { result } = renderHook(() => useEnrollments(3), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.enrollments).toHaveLength(1));
    });

    it("aprueba una admisión, avisa e invalida la caché de admisiones", async () => {
        courseServiceMock.approveEnrollment.mockResolvedValue({ id: 5 });
        const { result } = renderHook(() => useEnrollments(3), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.approveEnrollment(5);
        });

        expect(courseServiceMock.approveEnrollment).toHaveBeenCalledWith(5);
        expect(toastMock.success).toHaveBeenCalledWith("Inscripción aprobada");
        expect(invalidateScopeMock).toHaveBeenCalledWith(
            expect.anything(),
            "enrollments"
        );
    });

    it("rechaza una admisión, avisa e invalida la caché de admisiones", async () => {
        courseServiceMock.rejectEnrollment.mockResolvedValue({ id: 5 });
        const { result } = renderHook(() => useEnrollments(3), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.rejectEnrollment(5);
        });

        expect(courseServiceMock.rejectEnrollment).toHaveBeenCalledWith(5);
        expect(toastMock.success).toHaveBeenCalledWith("Inscripción rechazada");
        expect(invalidateScopeMock).toHaveBeenCalledWith(
            expect.anything(),
            "enrollments"
        );
    });
});

describe("useEnrollment", () => {
    it("envía la solicitud de inscripción y avisa", async () => {
        courseServiceMock.enrollInCourse.mockResolvedValue({ id: 9 });
        const { result } = renderHook(() => useEnrollment(3), {
            wrapper: createWrapper(),
        });

        let ok;
        await act(async () => {
            ok = await result.current.enroll(2);
        });

        expect(courseServiceMock.enrollInCourse).toHaveBeenCalledWith(3, 2);
        expect(ok).toBe(true);
        expect(toastMock.success).toHaveBeenCalledWith(
            "Solicitud de inscripción enviada"
        );
    });

    it("si la solicitud falla, devuelve false y avisa el error", async () => {
        courseServiceMock.enrollInCourse.mockRejectedValue(
            new Error("boom")
        );
        const { result } = renderHook(() => useEnrollment(3), {
            wrapper: createWrapper(),
        });

        let ok = true;
        await act(async () => {
            ok = await result.current.enroll(2);
        });

        expect(ok).toBe(false);
        expect(toastMock.error).toHaveBeenCalled();
    });
});

describe("useJoinCourseForm", () => {
    it("une por código y avisa", async () => {
        courseServiceMock.joinCourseByCode.mockResolvedValue({ id: 9 });
        const onSuccess = vi.fn();
        const { result } = renderHook(() => useJoinCourseForm({ onSuccess }), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.onSubmit({ join_code: "ABC123" });
        });

        expect(courseServiceMock.joinCourseByCode).toHaveBeenCalledWith(
            "ABC123",
            undefined
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Solicitud de inscripción enviada"
        );
        expect(onSuccess).toHaveBeenCalled();
    });

    it("si hay varias secciones pide elegir una y reenvía con la sección", async () => {
        courseServiceMock.joinCourseByCode.mockRejectedValue({
            response: {
                data: {
                    available_sections: [{ id: 2, name: "1TS1" }],
                },
            },
        });
        const { result, rerender } = renderHook(() => useJoinCourseForm(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await result.current.onSubmit({ join_code: "ABC123" });
        });

        expect(toastMock.info).toHaveBeenCalledWith(
            "Este curso tiene varias secciones. Selecciona una."
        );
        expect(result.current.pendingSections).toHaveLength(1);
        expect(result.current.selectedSectionId).toBe("");

        await act(async () => {
            await result.current.onSubmit({ join_code: "ABC123" });
        });

        expect(toastMock.error).toHaveBeenCalledWith(
            "Selecciona una sección para continuar"
        );
        expect(courseServiceMock.joinCourseByCode).toHaveBeenCalledTimes(1);

        courseServiceMock.joinCourseByCode.mockResolvedValue({ id: 9 });

        act(() => {
            result.current.setSelectedSectionId("2");
        });
        rerender();

        await act(async () => {
            await result.current.onSubmit({ join_code: "ABC123" });
        });

        expect(courseServiceMock.joinCourseByCode).toHaveBeenLastCalledWith(
            "ABC123",
            "2"
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Solicitud de inscripción enviada"
        );
    });
});