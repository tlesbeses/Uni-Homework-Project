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
            } catch (error) {
                if (!cancelled) {
                    setState("error");
                    if (error.response?.status === 429) {
                        setErrorMessage(
                            "Demasiados intentos. Espera un momento e inténtalo de nuevo."
                        );
                    } else {
                        setErrorMessage(
                            "El enlace de activación es inválido o ya fue utilizado."
                        );
                    }
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [uid, token]);

    return { state, errorMessage };
};