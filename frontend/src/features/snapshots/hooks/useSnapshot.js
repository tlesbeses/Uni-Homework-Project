import { useCallback, useEffect, useRef, useState } from "react";
import { getSnapshot } from "@/features/snapshots/services/snapshotService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useSnapshot = (snapshotId) => {
    const [snapshot, setSnapshot] = useState(null);
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
            const result = await getSnapshot(snapshotId, {
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setSnapshot(result);
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
    }, [snapshotId]);

    useEffect(() => {
        reload();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload]);

    return { snapshot, loading, error, reload };
};