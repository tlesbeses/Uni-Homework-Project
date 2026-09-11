import { useState } from "react";
import {
    keepPreviousData,
    useQuery,
} from "@tanstack/react-query";
import { getSnapshots } from "@/features/snapshots/services/snapshotService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useSnapshots = ({ search = "" } = {}) => {
    const [page, setPage] = useState(1);
    const params = { search: search || undefined, page };
    const query = useQuery({
        queryKey: queryKeys.snapshots.list(params),
        queryFn: () => getSnapshots(params),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    return {
        snapshots: query.data?.results ?? [],
        count: query.data?.count ?? 0,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        page,
        setPage,
        reload: () => query.refetch(),
    };
};