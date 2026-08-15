import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useAllData = (fetcher) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const all = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const result = await fetcher({ page, page_size: 100 });
                if (Array.isArray(result)) {
                    all.push(...result);
                    hasMore = false;
                } else {
                    const items = result.results ?? [];
                    all.push(...items);
                    hasMore = Boolean(result.next) && items.length > 0;
                    page += 1;
                }
            }
            setData(all);
        } catch (err) {
            setError(getErrorMessage(err));
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, setData, loading, error, reload };
};
