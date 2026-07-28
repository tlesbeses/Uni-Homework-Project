import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

export default function ProtectedRoute({
    children,
    roles = [],
    permissions = [],
    redirectTo = "/login",
    forbiddenTo = "/403",
}) {
    const { user, isLoading } = useAuth();
    console.log("ProtectedRoute user:", user);
    // Esperar a que el auth termine de hidratarse (localStorage, refresh token, etc.)
    if (isLoading) {
        return null; // o un <Spinner />
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    // Validar roles
    if (roles.length > 0 && !roles.includes(user?.role)) {
        return <Navigate to={forbiddenTo} replace />;
    }

    // Validar permisos (con optional chaining por si no existen)
    if (
        permissions.length > 0 &&
        !permissions.every((p) => user?.permissions?.includes(p))
    ) {
        return <Navigate to={forbiddenTo} replace />;
    }

    return children;
}