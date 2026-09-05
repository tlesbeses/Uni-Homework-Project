import { describe, expect, it } from "vitest";
import { invalidateScope, queryKeys } from "@/lib/queryKeys";

describe("queryKeys", () => {
    it("define claves para todos los dominios", () => {
        expect(queryKeys.courses.all).toEqual(["courses"]);
        expect(queryKeys.teams.all).toEqual(["teams"]);
        expect(queryKeys.assignments.all).toEqual(["assignments"]);
        expect(queryKeys.grades.all).toEqual(["grades"]);
        expect(queryKeys.dashboard.all).toEqual(["dashboard"]);
        expect(queryKeys.auth.me).toEqual(["auth", "me"]);
    });

    it("define claves de notificaciones sin autoprocesar antes de inicializar", () => {
        expect(queryKeys.notifications.all).toEqual(["notifications"]);
        expect(queryKeys.notifications.unreadCount()).toEqual([
            "notifications",
            "unread-count",
        ]);
    });

    it("construye claves con parámetros", () => {
        expect(queryKeys.notifications.list({ page: 2, unreadOnly: true })).toEqual([
            "notifications",
            "list",
            { page: 2, unreadOnly: true },
        ]);
        expect(queryKeys.courses.detail(7)).toEqual(["courses", "detail", 7]);
    });

    it("invalida scopes conocidos sin lanzar", () => {
        const fakeClient = {
            invalidateQueries: () => {},
        };
        expect(() => invalidateScope(fakeClient, "grades")).not.toThrow();
        expect(() => invalidateScope(fakeClient, "unknown")).not.toThrow();
    });
});