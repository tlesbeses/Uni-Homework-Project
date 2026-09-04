import { api, queryApi } from "@/lib/axios";

export const getGrades = async (params) => {
    const { signal, ...queryParams } = params ?? {};
    const response = await queryApi.get("/api/grades/", { params: queryParams, signal });
    return response.data;
};

export const gradeTeam = async (assignmentId, teamId, score, extra = {}) => {
    const response = await api.post(
        `/api/assignments/${assignmentId}/grade-team/`,
        { team: teamId, score, ...extra }
    );
    return response.data;
};

export const gradeStudent = async (assignmentId, studentId, score) => {
    const response = await api.post(
        `/api/assignments/${assignmentId}/grade-student/`,
        { student: studentId, score }
    );
    return response.data;
};

export const exportSectionGrades = async (sectionId) => {
    const response = await queryApi.get(
        `/api/sections/${sectionId}/export-grades/`,
        { responseType: "blob" }
    );
    return response.data;
};

export const exportSectionGradesCsv = async (sectionId) => {
    const response = await queryApi.get(
        `/api/sections/${sectionId}/export-grades-csv/`,
        { responseType: "blob" }
    );
    return response.data;
};

export const getSectionGradesReport = async (sectionId) => {
    const response = await queryApi.get(
        `/api/sections/${sectionId}/grades-report/`
    );
    return response.data;
};

export const getGradeHistory = async (gradeId, signal) => {
    const response = await queryApi.get(
        `/api/grades/${gradeId}/history/`,
        { signal }
    );
    return response.data;
};
