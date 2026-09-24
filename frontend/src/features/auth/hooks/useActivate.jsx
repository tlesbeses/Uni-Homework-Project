import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { activateUser } from "@/features/auth/services/authService";

export const useActivate = () => {
    const { uid, token } = useParams();
    const [state, setState] = useState("loading");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                await activateUser(uid, token);
                if (!cancelled) {
                    setState("success");
                }
            } catch {
                if (!cancelled) {
                    setState("error");
                    setErrorMessage(
                        "El enlace de activación es inválido o ya fue utilizado."
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [uid, token]);

    return { state, errorMessage };
};