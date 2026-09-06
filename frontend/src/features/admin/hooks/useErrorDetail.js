import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorLog } from "@/features/admin/services/adminService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useErrorDetail = (errorId) => {
    const [errorLog, setErrorLog] = useState(null);
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
            const result = await getErrorLog(errorId, {
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setErrorLog(result);
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
    }, [errorId]);

    useEffect(() => {
        reload();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload]);

    return { errorLog, loading, error, reload };
};