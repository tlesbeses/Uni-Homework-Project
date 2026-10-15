import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { authState, acceptMock } = vi.hoisted(() => ({
    authState: { user: null, isImpersonating: false },
    acceptMock: vi.fn(),
}));

vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authState,
}));

vi.mock("@/features/legal/hooks/useAcceptTerms", () => ({
    useAcceptTerms: () => ({ accept: acceptMock, isSubmitting: false }),
}));

import { TermsReacceptModal } from "@/features/legal/components/TermsReacceptModal";

function renderModal() {
    return render(
        <MemoryRouter>
            <TermsReacceptModal />
        </MemoryRouter>
    );
}

describe("TermsReacceptModal", () => {
    beforeEach(() => {
        acceptMock.mockReset();
        authState.user = null;
        authState.isImpersonating = false;
    });

    it("no se muestra cuando las versiones coinciden", () => {
        authState.user = { terms_version: "1.0", terms_current_version: "1.0" };

        renderModal();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("se muestra y permite aceptar cuando hay una version nueva", async () => {
        authState.user = { terms_version: "", terms_current_version: "1.0" };
        const user = userEvent.setup();

        renderModal();

        expect(
            screen.getByRole("dialog", {
                name: /Actualizamos los Términos y Condiciones/i,
            })
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Acepto los Términos y Condiciones" })
        );

        await waitFor(() => expect(acceptMock).toHaveBeenCalledTimes(1));
    });

    it("no se muestra a los superusuarios", () => {
        authState.user = {
            is_superuser: true,
            terms_version: "",
            terms_current_version: "1.0",
        };

        renderModal();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("no se muestra durante la impersonacion", () => {
        authState.user = { terms_version: "", terms_current_version: "1.0" };
        authState.isImpersonating = true;

        renderModal();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
