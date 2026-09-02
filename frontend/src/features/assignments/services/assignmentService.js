import { api, queryApi } from "@/lib/axios";

export const getAssignments = async (params) => {
    const { signal, ...queryParams } = params ?? {};
    const response = await queryApi.get("/api/assignments/", { params: queryParams, signal });
    return response.data;
};

export const getCourseAssignments = async (courseId, opts) => {
    const response = await queryApi.get(`/api/courses/${courseId}/assignments/`, { signal: opts?.signal });
    return response.data;
};

export const createAssignment = async (assignmentData) => {
    const response = await api.post("/api/assignments/", assignmentData);
    return response.data;
};

export const updateAssignment = async (assignmentId, assignmentData) => {
    const response = await api.patch(
        `/api/assignments/${assignmentId}/`,
        assignmentData
    );
    return response.data;
};

export const deleteAssignment = async (assignmentId) => {
    const response = await api.delete(`/api/assignments/${assignmentId}/`);
    return response.data;
};
