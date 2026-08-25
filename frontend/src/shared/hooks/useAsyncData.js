import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useAsyncData = (fetcher) => {
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
            const result = await fetcher({ signal: controller.signal });
            if (!controller.signal.aborted) {
                setData(
                    Array.isArray(result)
                        ? result
                        : Array.isArray(result?.results)
                            ? result.results
                            : result
                );
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
