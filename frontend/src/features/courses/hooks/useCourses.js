import { useCallback } from "react";
import { getCourses } from "@/features/courses/services/courseService";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";

export const useCourses = () => {
    const fetchCourses = useCallback(async () => {
        const data = await getCourses();
        return data.results ?? data;
    }, []);

    const { data, loading, error, reload } = useAsyncData(fetchCourses);

    return { courses: data ?? [], loading, error, loadCourses: reload };
};
