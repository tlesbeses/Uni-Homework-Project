import { useState } from "react";
import { testEmail } from "@/features/admin/services/adminService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useTestEmail = () => {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const run = async (toEmail = "") => {
        setRunning(true);
        setError("");
        setResult(null);
        try {
            setResult(await testEmail(toEmail));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setRunning(false);
        }
    };

    return { running, result, error, run };
};