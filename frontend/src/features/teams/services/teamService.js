import { api } from "@/lib/axios";

export const getTeams = async (params) => {
    const response = await api.get("api/teams/", { params });
    return response.data;
};

export const getTeam = async (teamId) => {
    const response = await api.get(`api/teams/${teamId}/`);
    return response.data;
};

export const createTeam = async (teamData) => {
    const response = await api.post("api/teams/", teamData);
    return response.data;
};

export const updateTeam = async (teamId, teamData) => {
    const response = await api.patch(`api/teams/${teamId}/`, teamData);
    return response.data;
};

export const deleteTeam = async (teamId) => {
    const response = await api.delete(`api/teams/${teamId}/`);
    return response.data;
};

export const addTeamMember = async (teamId, studentId) => {
    const response = await api.post(`api/teams/${teamId}/members/`, {
        student: studentId,
    });
    return response.data;
};

export const removeTeamMember = async (teamId, studentId) => {
    const response = await api.delete(
        `api/teams/${teamId}/members/${studentId}/`
    );
    return response.data;
};

export const changeTeamLeader = async (teamId, leaderId) => {
    const response = await api.post(`api/teams/${teamId}/change-leader/`, {
        leader: leaderId,
    });
    return response.data;
};
