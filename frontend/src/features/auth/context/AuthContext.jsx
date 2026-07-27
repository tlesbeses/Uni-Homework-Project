import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext,
    useEffect
} from "react";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem("user");
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (data) => {

        localStorage.setItem(
            "access",
            data.access
        );

        localStorage.setItem(
            "refresh",
            data.refresh
        );


        const userData = await getCurrentUser();


        setUser(userData);

    };

    const logout = () => {

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        setUser(null);

    };

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
