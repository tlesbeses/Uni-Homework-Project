// Claves de caché de TanStack Query, agrupadas por dominio. Usar estos
// helpers (en lugar de strings sueltas) garantiza consistencia al invalidar.
export const queryKeys = {
    courses: {
        all: ["courses"],

        list: (params) => [...queryKeys.courses.all, "list", params ?? {}],

        detail: (courseId) => [...queryKeys.courses.all, "detail", courseId],

        sections: (courseId) => [...queryKeys.courses.all, "sections", courseId],

        sectionsAll: () => [...queryKeys.courses.all, "sections", "all"],

        settings: (courseId) => [...queryKeys.courses.all, "settings", courseId],

        enrollments: (courseId) => [
            ...queryKeys.courses.all,
            "enrollments",
            courseId,
        ],

        enrollmentsAll: () => [...queryKeys.courses.all, "enrollments", "all"],
    },
    teams: {
        all: ["teams"],

        list: (params) => [...queryKeys.teams.all, "list", params ?? {}],

        detail: (teamId) => [...queryKeys.teams.all, "detail", teamId],
    },
    assignments: {
        all: ["assignments"],

        list: (params) => [...queryKeys.assignments.all, "list", params ?? {}],

        byCourse: (courseId) => [
            ...queryKeys.assignments.all,
            "course",
            courseId,
        ],
    },
    grades: {
        all: ["grades"],

        list: (params) => [...queryKeys.grades.all, "list", params ?? {}],

        report: (sectionId) => [...queryKeys.grades.all, "report", sectionId],
    },
    dashboard: {
        all: ["dashboard"],
    },
    notifications: {
        all: ["notifications"],

        list: (params) => [...queryKeys.notifications.all, "list", params ?? {}],

        unreadCount: [...queryKeys.notifications.all, "unread-count"],
    },
    auth: {
        me: ["auth", "me"],
    },
};

// Invalida todas las listas/detalles que pueden contener una entidad tras una
// mutación, imitando el barrido cross-namespace de `apiCache`. Se llama desde
// las mutationFn tras cada cambio relevante.
const scopeKeys = {
    courses: [queryKeys.courses.all, queryKeys.dashboard.all],
    // sections no tiene dominio propio en queries; se refleja en courses + dashboard.
    assignments: [
        queryKeys.assignments.all,
        queryKeys.courses.all,
        queryKeys.grades.all,
        queryKeys.dashboard.all,
    ],
    teams: [queryKeys.teams.all, queryKeys.courses.all],
    enrollments: [
        queryKeys.courses.enrollmentsAll(),
        queryKeys.courses.all,
        queryKeys.dashboard.all,
    ],
    grades: [queryKeys.grades.all, queryKeys.courses.all, queryKeys.dashboard.all],
};

export function invalidateScope(queryClient, resource) {
    const keys = scopeKeys[resource];
    if (!keys) {
        return;
    }
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}
