import { useQuery } from "@tanstack/react-query";
import { getAdminUsers } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useAdminUsers = ({ search = "", role = "" } = {}) => {
    const query = useQuery({
        queryKey: queryKeys.admin.users({ search, role }),
        queryFn: () =>
            getAdminUsers({
                search: search || undefined,
                role: role || undefined,
            }),
        staleTime: 30_000,
    });

    return {
        users: query.data ?? [],
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        reload: () => query.refetch(),
    };
};