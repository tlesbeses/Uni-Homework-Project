import { useQuery } from "@tanstack/react-query";
import { getSnapshot } from "@/features/snapshots/services/snapshotService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useSnapshot = (snapshotId) => {
    const query = useQuery({
        queryKey: queryKeys.snapshots.detail(snapshotId),
        queryFn: () => getSnapshot(snapshotId),
        enabled: Boolean(snapshotId),
        staleTime: 30_000,
    });

    return {
        snapshot: query.data,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        reload: () => query.refetch(),
    };
};