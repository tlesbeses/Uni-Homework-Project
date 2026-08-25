import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const MAX_PAGES = 50;

export const useAllData = (fetcher) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const abortRef = useRef(null);

    const reload = useCallback(async () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError("");
        try {
            const all = [];
            let page = 1;
            let hasMore = true;
            while (hasMore && page <= MAX_PAGES) {
                if (controller.signal.aborted) { break; }
                const result = await fetcher({
                    page,
                    page_size: 100,
                    signal: controller.signal,
                });
                if (Array.isArray(result)) {
                    all.push(...result);
                    hasMore = false;
                } else {
                    const items = Array.isArray(result.results)
                        ? result.results
                        : [];
                    all.push(...items);
                    hasMore = Boolean(result.next) && items.length > 0;
                    page += 1;
                }
            }
            if (!controller.signal.aborted) {
                setData(all);
            }
        } catch (err) {
            if (err.name !== "AbortError" && !controller.signal.aborted) {
                setError(getErrorMessage(err));
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [fetcher]);

    useEffect(() => {
        reload();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [reload]);

    return { data, setData, loading, error, reload };
};
