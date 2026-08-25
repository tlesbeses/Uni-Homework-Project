import { api } from "@/lib/axios";

export const getDashboard = async () => {
    const response = await api.get("/api/dashboard/");
    return response.data;
};

export const getCourses = async (params) => {
    const response = await api.get("/api/courses/", { params });
    return response.data;
};

export const getCourse = async (courseId) => {
    const response = await api.get(`/api/courses/${courseId}/`);
    return response.data;
};

export const createCourse = async (courseData) => {
    const response = await api.post("/api/courses/", courseData);
    return response.data;
};

export const updateCourse = async (courseId, courseData) => {
    const response = await api.patch(`/api/courses/${courseId}/`, courseData);
    return response.data;
};

export const deleteCourse = async (courseId) => {
    const response = await api.delete(`/api/courses/${courseId}/`);
    return response.data;
};

export const joinCourseByCode = async (joinCode, sectionId) => {
    const response = await api.post("/api/courses/join/", {
        join_code: joinCode,
        section: sectionId,
    });
    return response.data;
};

export const enrollInCourse = async (courseId, sectionId) => {
    const response = await api.post(`/api/courses/${courseId}/enroll/`, {
        section: sectionId,
    });
    return response.data;
};

export const getSections = async (courseId, params) => {
    const response = await api.get("/api/sections/", {
        params: courseId
            ? { course: courseId, ...(params ?? {}) }
            : { ...(params ?? {}) },
    });
    return response.data;
};

export const createSection = async (courseId, name) => {
    const response = await api.post("/api/sections/", {
        name,
        course_id: courseId,
    });
    return response.data;
};

export const updateSection = async (sectionId, sectionData) => {
    const response = await api.patch(
        `/api/sections/${sectionId}/`,
        sectionData
    );
    return response.data;
};

export const deleteSection = async (sectionId) => {
    const response = await api.delete(`/api/sections/${sectionId}/`);
    return response.data;
};

export const updateCourseSettings = async (courseId, settings) => {
    const response = await api.patch(
        `/api/courses/${courseId}/course_settings/`,
        settings
    );
    return response.data;
};

export const getEnrollments = async (courseId, params) => {
    const response = await api.get("/api/enrollments/", {
        params: courseId
            ? { course: courseId, ...(params ?? {}) }
            : { ...(params ?? {}) },
    });

    return response.data;
};
export const approveEnrollment = async (enrollmentId) => {
    const response = await api.post(`/api/enrollments/${enrollmentId}/approve/`);
    return response.data;
};

export const rejectEnrollment = async (enrollmentId) => {
    const response = await api.post(`/api/enrollments/${enrollmentId}/reject/`);
    return response.data;
};

export const deleteEnrollment = async (enrollmentId) => {
    const response = await api.delete(`/api/enrollments/${enrollmentId}/`);
    return response.data;
};
