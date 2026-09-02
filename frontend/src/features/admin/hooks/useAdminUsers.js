import { useCallback } from "react";
import { getAdminUsers } from "@/features/admin/services/adminService";
import { useAllData } from "@/shared/hooks/useAllData";

export const useAdminUsers = ({ search = "", role = "" } = {}) => {
    const fetchUsers = useCallback(
        (params) =>
            getAdminUsers({
                ...params,
                search: search || undefined,
                role: role || undefined,
            }),
        [search, role]
    );

    const { data, setData, loading, error, reload } = useAllData(fetchUsers);

    return {
        users: data ?? [],
        setUsers: setData,
        loading,
        error,
        reload,
    };
};