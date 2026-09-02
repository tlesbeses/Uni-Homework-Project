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
    impersonateUser,
    loginUser,
    logoutUser,
} from "@/features/auth/services/authService";
import { refreshSession } from "@/lib/axios";
import { impersonation } from "@/lib/impersonation";
import { invalidateCache } from "@/lib/apiCache";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { toast } from "react-toastify";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [impersonatedUser, setImpersonatedUser] = useState(null);

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

    const isAdmin = user?.is_superuser ?? false;

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
        } catch {
            // Silently handle logout server errors
        } finally {
            tokenStorage.clear();
            window.location.assign("/login");
        }
    }, []);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
    }, []);

    const restoreAdminSession = useCallback(() => {
        const { adminAccessToken, adminProfile } = impersonation.getState();
        impersonation.clear();
        if (adminAccessToken) {
            tokenStorage.setAccessToken(adminAccessToken);
        }
        invalidateCache();
        setUser(adminProfile);
        setImpersonatedUser(null);
    }, []);

    const stopImpersonation = useCallback(() => {
        restoreAdminSession();
        toast.info("Impersonación terminada. Volviste a tu cuenta.");
    }, [restoreAdminSession]);

    // Si el access token impersonado caduca, el interceptor refresca con la
    // cookie del admin y detecta la pérdida de la sesión de prueba: se vuelve
    // al perfil y tokens del admin sin intervención del usuario.
    useEffect(() => {
        impersonation.setLostHandler(() => {
            restoreAdminSession();
            toast.warn(
                "La sesión de prueba expiró. Volviste a tu cuenta de administrador."
            );
        });
        return () => impersonation.setLostHandler(null);
    }, [restoreAdminSession]);

    // Intercambia SOLO el access token en memoria: la app entera pasa a ver
    // y actuar como el usuario objetivo hasta recargar/terminar la vista.
    const startImpersonation = useCallback(async (targetUser) => {
        const adminAccessToken = tokenStorage.getAccessToken();
        const adminProfile = user;

        try {
            const { access } = await impersonateUser(targetUser.id);
            impersonation.start({
                adminAccessToken,
                adminProfile,
                impersonatedUserId: targetUser.id,
                impersonatedUser: targetUser,
            });
            tokenStorage.setAccessToken(access);
            invalidateCache();
            const profile = await getUserProfile();
            setUser(profile);
            setImpersonatedUser(targetUser);
            return true;
        } catch (err) {
            impersonation.clear();
            toast.error(getErrorMessage(err));
            return false;
        }
    }, [user]);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: user !== null,
        isTeacher,
        isStudent,
        isAdmin,
        impersonatedAs: impersonatedUser,
        isImpersonating: impersonatedUser !== null,
        login,
        logout,
        updateUser,
        startImpersonation,
        stopImpersonation,
    }), [
        user,
        isLoading,
        isTeacher,
        isStudent,
        isAdmin,
        impersonatedUser,
        login,
        logout,
        updateUser,
        startImpersonation,
        stopImpersonation,
    ]);

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
