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

export function invalidateCache(pattern) {
    if (!pattern) {
        store.clear();
        return;
    }
    for (const key of store.keys()) {
        if (key.includes(pattern)) {
            store.delete(key);
        }
    }
}
