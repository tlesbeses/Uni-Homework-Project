import { describe, expect, it } from "vitest";
import { needsTermsAcceptance } from "@/features/legal/utils";

describe("needsTermsAcceptance", () => {
    it("pide aceptar cuando el usuario nunca acepto (version vacia)", () => {
        expect(
            needsTermsAcceptance({ terms_version: "", terms_current_version: "1.0" })
        ).toBe(true);
    });

    it("pide aceptar cuando la version aceptada es anterior a la vigente", () => {
        expect(
            needsTermsAcceptance({ terms_version: "1.0", terms_current_version: "2.0" })
        ).toBe(true);
    });

    it("no pide aceptar cuando las versiones coinciden", () => {
        expect(
            needsTermsAcceptance({ terms_version: "1.0", terms_current_version: "1.0" })
        ).toBe(false);
    });

    it("exime a los superusuarios", () => {
        expect(
            needsTermsAcceptance({
                is_superuser: true,
                terms_version: "",
                terms_current_version: "1.0",
            })
        ).toBe(false);
    });

    it("devuelve false sin usuario", () => {
        expect(needsTermsAcceptance(null)).toBe(false);
        expect(needsTermsAcceptance(undefined)).toBe(false);
    });
});
