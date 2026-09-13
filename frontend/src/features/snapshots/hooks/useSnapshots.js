import { useState } from "react";
import {
    keepPreviousData,
    useQuery,
} from "@tanstack/react-query";
import { getSnapshots } from "@/features/snapshots/services/snapshotService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 9;

export const useSnapshots = ({ search = "" } = {}) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const params = { search: search || undefined, page, page_size: pageSize };
    const query = useQuery({
        queryKey: queryKeys.snapshots.list(params),
        queryFn: () => getSnapshots(params),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const snapshots = query.data?.results ?? [];
    const count = query.data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        snapshots,
        count,
        totalPages,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        page,
        setPage,
        pageSize,
        handlePageSizeChange,
        reload: () => query.refetch(),
    };
};