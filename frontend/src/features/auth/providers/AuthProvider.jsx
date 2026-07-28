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

        const user = localStorage.getItem("user");

        if (!user) {
            setIsLoading(false);
            return;
        }
        try {
            setUser(JSON.parse(user));
            console.log("AuthProvider user:", JSON.parse(user));
        } catch {
            logout();
        } finally {
            setIsLoading(false);
        }


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

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );



        setUser(data.user);

    }, []);

    const logout = useCallback(() => {

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
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
