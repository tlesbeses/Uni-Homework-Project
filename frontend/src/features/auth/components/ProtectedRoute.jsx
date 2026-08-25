import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";

export function ProtectedRoute({
    children,
    roles = [],
    permissions = [],
    redirectTo = "/401",
    forbiddenTo = "/403",
}) {
    const { user, isLoading } = useAuth();
    if (isLoading) {
        return null;
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    if (roles.length > 0 && !user?.roles?.some(role => roles.includes(role))) {
    return <Navigate to={forbiddenTo} replace />;
}

    if (
        permissions.length > 0 &&
        !permissions.every((p) => user?.permissions?.includes(p))
    ) {
        return <Navigate to={forbiddenTo} replace />;
    }

    return children;
}