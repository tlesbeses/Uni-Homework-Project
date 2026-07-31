import { useState } from "react";
import { logoutRequest } from "@/features/auth/services/authService";
import { tokenStorage, userStorage } from "@/shared/storage/tokenStorage";
import { api } from "@/lib/axios";

export const useLogout = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken) {
                await logoutRequest({ refresh: refreshToken });
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Error al cerrar sesión");
        } finally {
            tokenStorage.clear(); // Borra Access y Refresh Tokens
            userStorage.clear();  // Borra la información del objeto usuario

            // Quitamos el token viejo de la configuración por defecto de Axios si existía
            if (api.defaults.headers.common["Authorization"]) {
                delete api.defaults.headers.common["Authorization"];
            }

            setIsLoading(false);

            // 3. REDIRECCIÓN ABSOLUTA
            window.location.href = "/login";
        }
    };

    return {
        handleLogout,
        isLoading,
        error
    };
};
