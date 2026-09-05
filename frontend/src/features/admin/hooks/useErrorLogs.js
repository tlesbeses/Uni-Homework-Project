import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorLogs } from "@/features/admin/services/adminService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useErrorLogs = ({ source = "" } = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const abortRef = useRef(null);

    const reload = useCallback(async (targetPage = 1) => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError("");
        try {
            const result = await getErrorLogs({
                source: source || undefined,
                page: targetPage,
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setData(result);
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
    }, [source]);

    useEffect(() => {
        reload(page);
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, page]);

    return {
        logs: data?.results ?? [],
        count: data?.count ?? 0,
        loading,
        error,
        page,
        setPage,
        reload,
    };
};