import { useCallback } from "react";
import { getCourses } from "@/features/courses/services/courseService";
import { useAllData } from "@/features/courses/hooks/useAllData";

export const useCourses = () => {
    const fetchAll = useCallback((params) => getCourses(params), []);

    const { data, loading, error, reload } = useAllData(fetchAll);

    return { courses: data ?? [], loading, error, loadCourses: reload };
};
