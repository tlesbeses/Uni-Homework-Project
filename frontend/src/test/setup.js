import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom no implementa matchMedia: los hooks responsive lo necesitan.
if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

// Jsdom lanza "Not implemented: navigation" al navegar; lo sustituimos por
// spies para poder afirmar redirecciones (login/logout).
function stubLocationNavigation() {
    const current = window.location;
    try {
        Object.defineProperty(window, "location", {
            configurable: true,
            writable: true,
            value: {
                ...current,
                replace: vi.fn(),
                assign: vi.fn(),
                reload: vi.fn(),
            },
        });
    } catch {
        // Si jsdom no permite redefinir location, los tests lo stubean aislados.
    }
}

beforeEach(() => {
    stubLocationNavigation();
    window.scrollTo = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});