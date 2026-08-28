const DEFAULT_TTL = 60_000;

const store = new Map();

export function cacheKey(method, url, params) {
    const sorted = params
        ? Object.keys(params)
              .sort()
              .map((k) => `${k}=${JSON.stringify(params[k])}`)
              .join("&")
        : "";
    return `${method}:${url}:${sorted}`;
}

export function getCached(key) {
    const entry = store.get(key);
    if (!entry) {
        return undefined;
    }
    if (Date.now() > entry.expiry) {
        store.delete(key);
        return undefined;
    }
    return entry.data;
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
    store.set(key, { data, expiry: Date.now() + ttl });
}

// Toda mutacion sobre una entidad debe invalidar todas las representaciones
// de lectura (GETs cacheados) que pueden mostrar esa entidad, aunque vivan
// bajo OTRA URL (cross-namespace). P. ej. editar una asignacion invalida
// tambien `/api/courses/{id}/assignments/` y el reporte de notas de la
// seccion, no solo `/api/assignments/`.
const RESOURCE_READ_PREFIXES = {
    courses: [
        "/api/courses/",
        "/api/dashboard/",
        "/api/sections/",
        "/api/teams/",
        "/api/enrollments/",
    ],
    sections: [
        "/api/sections/",
        "/api/courses/",
        "/api/teams/",
        "/api/enrollments/",
        "/api/dashboard/",
        "/api/grades/",
    ],
    assignments: [
        "/api/assignments/",
        "/api/courses/",
        "/api/sections/",
        "/api/grades/",
        "/api/dashboard/",
    ],
    grades: [
        "/api/grades/",
        "/api/sections/",
        "/api/assignments/",
        "/api/dashboard/",
    ],
    teams: [
        "/api/teams/",
        "/api/courses/",
        "/api/sections/",
        "/api/enrollments/",
    ],
    enrollments: [
        "/api/enrollments/",
        "/api/courses/",
        "/api/sections/",
        "/api/dashboard/",
    ],
};

// Regresa la lista de prefijos de URL a invalidar cuando se muta una ruta.
function collectionPrefixesFor(url) {
    const u = url.replace(/\?.*$/, "");

    // Entidad afectada = primer segmento del path bajo /api/.
    const match = u.match(/^\/api\/([^/]+)/);
    const resource = match ? match[1] : null;
    const prefixes = new Set(RESOURCE_READ_PREFIXES[resource] ?? []);

    // Refuerzos para mutaciones de subrecursos/acciones que aun no caen en la
    // coleccion "padre" estricta (p. ej. /auth/*, /api/dashboard/nested/...).
    if (u.includes("/course_settings/")) {
        prefixes.add("/api/courses/");
        prefixes.add("/api/dashboard/");
    }
    if (u.includes("/enroll/") || u.includes("/join/")) {
        prefixes.add("/api/enrollments/");
        prefixes.add("/api/courses/");
        prefixes.add("/api/dashboard/");
    }

    return [...prefixes];
}

export function invalidateCache(url) {
    if (!url) {
        store.clear();
        return;
    }

    const patterns = collectionPrefixesFor(url);
    if (patterns.length === 0) {
        store.clear();
        return;
    }

    for (const key of store.keys()) {
        if (patterns.some((p) => key.includes(p))) {
            store.delete(key);
        }
    }
}
