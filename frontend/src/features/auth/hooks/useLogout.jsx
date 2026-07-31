import { useAuth } from "@/features/auth/providers/AuthProvider";

export const useLogout = () => {
    const { logout, isLoading } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return {
        handleLogout,
        isLoading
    };
};
