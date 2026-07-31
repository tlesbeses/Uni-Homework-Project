import { useAuth } from "@/features/auth/providers/AuthProvider";

export const useLogout = () => {
    const { logout, isLoading } = useAuth();

    return {
        logout,
        isLoading
    };
};
