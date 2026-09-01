// Recorre todas las páginas de un endpoint paginado (page_size 100) y
// devuelve la lista plana de resultados. Útil como queryFn de TanStack Query
// para listas que necesitan todos los registros (p. ej. selects, reportes).
const MAX_PAGES = 50;

export async function fetchAllPages(request, params = {}) {
    const all = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES) {
        const data = await request({ page, page_size: 100, ...params });
        if (Array.isArray(data)) {
            all.push(...data);
            hasMore = false;
        } else {
            const items = Array.isArray(data.results) ? data.results : [];
            all.push(...items);
            hasMore = Boolean(data.next) && items.length > 0;
            page += 1;
        }
    }

    if (hasMore && page > MAX_PAGES) {
        // Evitar cargar cientos de páginas: el límite evita un DoS y la
        // advertencia evita que el truncado pase desapercibido.
        console.warn(
            `fetchAllPages: se alcanzó el límite de ${MAX_PAGES} páginas` +
                " y la lista pudo quedar incompleta."
        );
    }

    return all;
}
