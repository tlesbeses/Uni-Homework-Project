import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { FullScreenLoader } from "@/shared/components/FullScreenLoader";

export function ProtectedRoute({
    children,
    roles = [],
    permissions = [],
    superuserOnly = false,
    blockSuperuser = false,
    redirectTo = "/login",
    forbiddenTo = "/403",
}) {
    const { user, isLoading, isImpersonating } = useAuth();
    if (isLoading) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    if (superuserOnly && !user?.is_superuser) {
        return <Navigate to={forbiddenTo} replace />;
    }

    if (
        blockSuperuser &&
        user?.is_superuser &&
        !isImpersonating
    ) {
        return <Navigate to={forbiddenTo} replace />;
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