import { useSyncExternalStore } from "react";

function getSnapshot(query) {
    if (typeof window === "undefined" || !window.matchMedia) {
        return false;
    }
    return window.matchMedia(query).matches;
}

function subscribe(query, onStoreChange) {
    if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
    }
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
}

export const useMediaQuery = (query) =>
    useSyncExternalStore(
        (onStoreChange) => subscribe(query, onStoreChange),
        () => getSnapshot(query),
        () => false,
    );