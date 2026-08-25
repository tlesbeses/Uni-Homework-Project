import { useCallback, useEffect, useState } from "react";
import { setThrottleListener } from "@/lib/axios";
import { ThrottleToast } from "@/shared/components/ThrottleToast";

export function ThrottleManager() {
    const [retryAfter, setRetryAfter] = useState(0);

    useEffect(() => {
        setThrottleListener((seconds) => {
            setRetryAfter(seconds);
        });
    }, []);

    const handleDone = useCallback(() => {
        setRetryAfter(0);
    }, []);

    if (retryAfter <= 0) {
        return null;
    }

    return <ThrottleToast retryAfter={retryAfter} onDone={handleDone} />;
}
