import { describe, expect, it } from "vitest";
import {
    assignmentFormSchema,
    category,
    parcial,
} from "@/features/assignments/schemas/assignmentSchemas";

describe("assignmentFormSchema · categoría y parcial", () => {
    it("usa ACUMULADO y PRIMERO por defecto si no se envían", () => {
        const result = assignmentFormSchema.safeParse({
            title: "Tarea",
            max_score: "10",
            is_published: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.category).toBe("ACUMULADO");
            expect(result.data.parcial).toBe("PRIMERO");
        }
    });

    it("acepta un examen del segundo parcial", () => {
        const result = assignmentFormSchema.safeParse({
            title: "Parcial 2",
            max_score: "100",
            category: "EXAMEN",
            parcial: "SEGUNDO",
            is_published: true,
        });
        expect(result.success).toBe(true);
    });

    it("rechaza una categoría inválida", () => {
        const result = assignmentFormSchema.safeParse({
            title: "Tarea",
            max_score: "10",
            category: "TRABAJO",
            parcial: "PRIMERO",
            is_published: true,
        });
        expect(result.success).toBe(false);
    });

    it("rechaza un parcial inválido", () => {
        const result = assignmentFormSchema.safeParse({
            title: "Tarea",
            max_score: "10",
            category: "ACUMULADO",
            parcial: "TERCERO",
            is_published: true,
        });
        expect(result.success).toBe(false);
    });
});

describe("categoría y parcial exportados", () => {
    it("aceptan ambos valores de cada enumeración", () => {
        for (const value of ["ACUMULADO", "EXAMEN"]) {
            expect(category.parse(value)).toBe(value);
        }
        for (const value of ["PRIMERO", "SEGUNDO"]) {
            expect(parcial.parse(value)).toBe(value);
        }
    });
});