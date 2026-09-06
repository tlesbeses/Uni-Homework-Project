import { describe, expect, it } from "vitest";
import { notificationMeta } from "@/shared/utils/notificationMeta";

describe("notificationMeta", () => {
    it("describe una calificación publicada", () => {
        const payload = {
            assignment_title: "Homework 1",
            course_id: 7,
            course_title: "Math 101",
        };
        const meta = notificationMeta({
            type: "grade_published",
            payload,
        });

        expect(meta.label).toBe("Nueva calificación");
        expect(meta.message(payload)).toContain("Homework 1");
        expect(meta.route(payload)).toBe("/courses/7");
    });

    it("describe una admisión aprobada", () => {
        const payload = {
            course_id: 2,
            course_title: "Math 101",
            section_name: "1TS1",
        };
        const meta = notificationMeta({
            type: "enrollment_approved",
            payload,
        });

        expect(meta.message(payload)).toContain("Math 101");
        expect(meta.route(payload)).toBe("/courses/2");
    });

    it("describe una solicitud de admisión para el profesor", () => {
        const payload = {
            course_id: 2,
            course_title: "Math 101",
            section_name: "1TS1",
            student_name: "Pepito",
        };
        const meta = notificationMeta({
            type: "enrollment_requested",
            payload,
        });

        expect(meta.message(payload)).toContain("Pepito");
        expect(meta.route(payload)).toBe("/courses/2");
    });

    it("devuelve un fallback para tipos desconocidos", () => {
        const meta = notificationMeta({ type: "mystery", payload: {} });
        expect(meta.label).toBe("Notificación");
        expect(meta.route()).toBe("/notifications");
    });

    it("devuelve un fallback si no hay notificación", () => {
        const meta = notificationMeta(null);
        expect(meta.label).toBe("Notificación");
    });
});