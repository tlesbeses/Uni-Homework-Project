import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useAsyncData = (fetcher) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await fetcher();
            setData(result);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, setData, loading, error, reload };
};
