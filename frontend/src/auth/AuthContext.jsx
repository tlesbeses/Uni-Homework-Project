import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext
} from "react";

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = useCallback((userData) => {
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        login,
        logout,
        isAuthenticated: user !== null
    }), [user, login, logout]);

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