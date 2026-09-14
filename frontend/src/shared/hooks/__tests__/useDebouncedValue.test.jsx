import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("devuelve el valor inicial al montar", () => {
        const { result } = renderHook(() =>
            useDebouncedValue("inicial", 400)
        );
        expect(result.current).toBe("inicial");
    });

    it("emite el valor nuevo tras el delay", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 400),
            { initialProps: { value: "a" } }
        );
        expect(result.current).toBe("a");

        rerender({ value: "b" });
        expect(result.current).toBe("a");
        act(() => {
            vi.advanceTimersByTime(399);
        });
        expect(result.current).toBe("a");
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe("b");
    });

    it("resetea el temporizador si el valor cambia antes del delay", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 400),
            { initialProps: { value: "a" } }
        );

        rerender({ value: "b" });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        rerender({ value: "c" });
        act(() => {
            vi.advanceTimersByTime(399);
        });
        expect(result.current).toBe("a");
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe("c");
    });

    it("respeta un delay personalizado", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 1000),
            { initialProps: { value: "x" } }
        );
        rerender({ value: "y" });
        act(() => {
            vi.advanceTimersByTime(999);
        });
        expect(result.current).toBe("x");
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe("y");
    });
});