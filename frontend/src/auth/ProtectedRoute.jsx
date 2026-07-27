import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
    children,
    requireAuth = true,
    roles = [],
    permissions = [],
}) {
    const { user } = useAuth();

    // 1. ¿Debe estar autenticado?
    if (requireAuth && !user) {
        return <Navigate to="/login" replace />;
    }

    // 2. Validar roles
    if (
        roles.length > 0 &&
        !roles.includes(user.role)
    ) {
        return <Navigate to="/403" replace />;
    }

    // 3. Validar permisos
    if (
        permissions.length > 0 &&
        !permissions.every(permission =>
            user.permissions.includes(permission)
        )
    ) {
        return <Navigate to="/403" replace />;
    }

    return children;
}