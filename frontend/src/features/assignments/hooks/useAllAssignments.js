import { useCallback, useState } from "react";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";
import { getAssignments } from "@/features/assignments/services/assignmentService";

export const useAllAssignments = () => {
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchPage = useCallback(async (pageNumber) => {
        const data = await getAssignments({ page: pageNumber });
        setHasMore(Boolean(data.next));
        return data.results ?? [];
    }, []);

    const { data, setData, loading, error, reload: reloadFirstPage } =
        useAsyncData(useCallback(() => fetchPage(1), [fetchPage]));

    const reload = useCallback(async () => {
        setPage(1);
        await reloadFirstPage();
    }, [reloadFirstPage]);

    const loadMore = async () => {
        const nextPage = page + 1;
        const results = await fetchPage(nextPage);
        setData((current) => [...(current ?? []), ...results]);
        setPage(nextPage);
    };

    return {
        assignments: data ?? [],
        loading,
        error,
        hasMore,
        reload,
        loadMore,
    };
};
