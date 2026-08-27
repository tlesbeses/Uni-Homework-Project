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

// Regresa la lista de prefijos de URL a invalidar cuando se muta una ruta.
// El objetivo es que editar/borrar un recurso o mutar un subrecurso invalide
// tambien las listas padre que lo muestran (p. ej. al aprobar una inscripcion
// se refresca el listado de inscripciones y el reporte de la seccion).
function collectionPrefixesFor(url) {
    const prefixes = new Set();

    // Recurso base: /api/<recurso>/ (la coleccion completa del recurso).
    const baseMatch = url.match(/^(\/api\/[^/]+\/)/);
    if (baseMatch) {
        prefixes.add(baseMatch[1]);
    }

    const u = url;

    // Mutaciones de subrecursos -> refrescar tambien las colecciones que los agregan.
    if (/\/approve\/$|\/reject\/$|\/grade-student\/$|\/grade-team\/$/.test(u)) {
        prefixes.add("/api/enrollments/");
        prefixes.add("/api/grades/");
        prefixes.add("/api/sections/");
        prefixes.add("/api/assignments/");
        prefixes.add("/api/dashboard/");
        prefixes.add("/api/courses/");
    }
    if (/\/change-leader\/$|\/members\/$/.test(u)) {
        prefixes.add("/api/teams/");
        prefixes.add("/api/courses/");
        prefixes.add("/api/sections/");
    }
    if (u.includes("/course_settings/")) {
        prefixes.add("/api/courses/");
    }
    if (u.includes("/enroll/") || u.includes("/join/")) {
        prefixes.add("/api/enrollments/");
        prefixes.add("/api/courses/");
    }
    if (u.includes("/delete-member/") || u.includes("/leave/") || u.includes("/remove-student/")) {
        prefixes.add("/api/teams/");
        prefixes.add("/api/enrollments/");
        prefixes.add("/api/courses/");
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
