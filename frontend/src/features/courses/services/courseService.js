import { api } from "@/lib/axios";

export const getCourses = async () => {
    const response = await api.get("api/courses/");
    return response.data;
};

export const getCourse = async (courseId) => {
    const response = await api.get(`api/courses/${courseId}/`);
    return response.data;
};

export const createCourse = async (courseData) => {
    const response = await api.post("api/courses/", courseData);
    return response.data;
};

export const updateCourse = async (courseId, courseData) => {
    const response = await api.patch(`api/courses/${courseId}/`, courseData);
    return response.data;
};

export const deleteCourse = async (courseId) => {
    const response = await api.delete(`api/courses/${courseId}/`);
    return response.data;
};

export const joinCourseByCode = async (joinCode) => {
    const response = await api.post("api/courses/join/", { join_code: joinCode });
    return response.data;
};

export const enrollInCourse = async (courseId) => {
    const response = await api.post(`api/courses/${courseId}/enroll/`);
    return response.data;
};

export const updateCourseSettings = async (courseId, settings) => {
    const response = await api.patch(
        `api/courses/${courseId}/course_settings/`,
        settings
    );
    return response.data;
};

export const getEnrollments = async (courseId) => {
    const response = await api.get("api/enrollments/", {
        params: courseId ? { course: courseId } : {},
    });
    return response.data;
};

export const approveEnrollment = async (enrollmentId) => {
    const response = await api.post(`api/enrollments/${enrollmentId}/approve/`);
    return response.data;
};

export const rejectEnrollment = async (enrollmentId) => {
    const response = await api.post(`api/enrollments/${enrollmentId}/reject/`);
    return response.data;
};
