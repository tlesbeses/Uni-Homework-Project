import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext,
    useEffect
} from "react";

import { tokenStorage, clearLegacyTokens } from "@/shared/storage/tokenStorage";
import {
    ensureCsrfToken,
    getUserProfile,
    loginUser,
    logoutUser,
} from "@/features/auth/services/authService";
import { refreshSession } from "@/lib/axios";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function restoreSession() {
            // Elimina credenciales persistidas por versiones anteriores.
            clearLegacyTokens();

            try {
                // Garantiza el token CSRF (necesario también para el login).
                await ensureCsrfToken();

                // El access token vive solo en memoria; al recargar la página
                // se restaura desde la cookie HttpOnly de refresh. Cuando la
                // API está en otro origen no existe señal legible de sesión,
                // así que se intenta siempre: un visitante anónimo solo cuesta
                // un 401 (refreshSession usa authApi, sin interceptores).
                await refreshSession();
                const profile = await getUserProfile();

                if (!cancelled) {
                    setUser(profile);
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        restoreSession();

        return () => {
            cancelled = true;
        };
    }, []);

    const isTeacher = user?.roles?.some(
        (role) => role === "Teacher"
    ) ?? false;

    const isStudent = user?.roles?.some(
        (role) => role === "Student"
    ) ?? false;

    const login = useCallback(async (credentials) => {
        setIsLoading(true);
        try {
            const data = await loginUser(credentials);

            // El backend entrega el refresh en una cookie HttpOnly;
            // aquí solo guardamos el access token en memoria.
            tokenStorage.setAccessToken(data.access);
            setUser(data.user);

            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            // El servidor blackliste el refresh (cookie) y limpia las cookies.
            await logoutUser();
        } catch (error) {
            console.error("Error al reportar el logout al servidor:", error);
        } finally {
            tokenStorage.clear();
            setUser(null);
            setIsLoading(false);
            window.location.assign("/login");
        }
    }, []);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: user !== null,
        isTeacher,
        isStudent,
        login,
        logout,
        updateUser
    }), [user, isLoading, isTeacher, isStudent, login, logout, updateUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
