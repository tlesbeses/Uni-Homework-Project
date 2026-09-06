import { queryApi } from "@/lib/axios";
import { downloadBlob } from "@/shared/utils/downloadBlob";

export const getSnapshots = async (params) => {
    const { signal, ...queryParams } = params ?? {};
    const response = await queryApi.get("/api/snapshots/", {
        params: queryParams,
        signal,
    });
    return response.data;
};

export const getSnapshot = async (snapshotId, opts) => {
    const response = await queryApi.get(`/api/snapshots/${snapshotId}/`, {
        signal: opts?.signal,
    });
    return response.data;
};

export const exportSnapshotGrades = async (snapshotId) => {
    const response = await queryApi.get(
        `/api/snapshots/${snapshotId}/export-grades/`,
        { responseType: "blob" }
    );
    downloadBlob(response.data, `notas_grupo_borrado_${snapshotId}.xlsx`);
};

export const exportSnapshotGradesCsv = async (snapshotId) => {
    const response = await queryApi.get(
        `/api/snapshots/${snapshotId}/export-grades-csv/`,
        { responseType: "blob" }
    );
    downloadBlob(response.data, `notas_grupo_borrado_${snapshotId}.csv`);
};