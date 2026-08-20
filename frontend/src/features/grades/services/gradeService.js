import { api } from "@/lib/axios";

export const getGrades = async (params) => {
    const response = await api.get("/api/grades/", { params });
    return response.data;
};

export const gradeTeam = async (assignmentId, teamId, score) => {
    const response = await api.post(
        `/api/assignments/${assignmentId}/grade-team/`,
        { team: teamId, score }
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
