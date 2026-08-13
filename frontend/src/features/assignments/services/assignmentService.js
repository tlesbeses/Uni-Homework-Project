import { api } from "@/lib/axios";

export const getAssignments = async (params) => {
    const response = await api.get("api/assignments/", { params });
    return response.data;
};

export const getCourseAssignments = async (courseId) => {
    const response = await api.get(`api/courses/${courseId}/assignments/`);
    return response.data;
};

export const createAssignment = async (assignmentData) => {
    const response = await api.post("api/assignments/", assignmentData);
    return response.data;
};

export const updateAssignment = async (assignmentId, assignmentData) => {
    const response = await api.patch(
        `api/assignments/${assignmentId}/`,
        assignmentData
    );
    return response.data;
};

export const deleteAssignment = async (assignmentId) => {
    const response = await api.delete(`api/assignments/${assignmentId}/`);
    return response.data;
};
