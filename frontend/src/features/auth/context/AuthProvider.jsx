import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext,
    useEffect
} from "react";
import { getUserProfile } from "../services/authService";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initialize = async () => {
            const token = localStorage.getItem("access");

            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = await getUserProfile();
                setUser(userData);
            } catch {
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, []);


    const login = useCallback(async (data) => {

        localStorage.setItem(
            "access",
            data.access
        );

        localStorage.setItem(
            "refresh",
            data.refresh
        );


        const userData = await getUserProfile();
        setUser(userData);

        return userData;
    }, []);

    const logout = useCallback(() => {

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        setUser(null);

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
