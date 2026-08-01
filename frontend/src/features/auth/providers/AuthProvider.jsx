import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext,
    useEffect
} from "react";

import { tokenStorage, userStorage } from "@/shared/storage/tokenStorage";
import { loginUser, logoutUser } from "@/features/auth/services/authService";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = userStorage.getUser();

        if (storedUser) {
            setUser(storedUser);
        }

        setIsLoading(false);
    }, []);


    const login = useCallback(async (credentials) => {
        setIsLoading(true);
        try {
            const data = await loginUser(credentials);
            tokenStorage.setAccessToken(data.access);
            tokenStorage.setRefreshToken(data.refresh);
            userStorage.setUser(data.user);

            setUser(data.user);

            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            const refreshToken = tokenStorage.getRefreshToken();

            if (refreshToken) {
                await logoutUser({ refresh: refreshToken });
            }
        } catch (error) {
            console.error("Error al reportar el logout al servidor:", error);
        } finally {
            tokenStorage.clear();
            userStorage.clear();
            setUser(null);
            setIsLoading(false);
            window.location.assign("/login");
        }
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout
    }), [user, isLoading, login, logout]);

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
