import { useCallback, useEffect, useRef, useState } from "react";
import { getLoginStats } from "@/features/admin/services/adminService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

// Métricas de acceso (logins y usuarios únicos por día) para la consola de
// administración. Mismo patrón que el resto de hooks del panel admin: estado
// manual con AbortController (sin TanStack Query).
export const useLoginStats = (days = 7) => {
    const [stats, setStats] = useState(null);
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
            const result = await getLoginStats({
                days,
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setStats(result);
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
    }, [days]);

    useEffect(() => {
        reload();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload]);

    return { stats, loading, error, reload };
};