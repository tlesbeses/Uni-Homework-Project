import { useCallback } from "react";
import { getCourse } from "@/features/courses/services/courseService";
import { useAsyncData } from "@/shared/hooks/useAsyncData";

export const useCourse = (courseId) => {
    const fetchCourse = useCallback((opts) => getCourse(courseId, opts), [courseId]);

    const { data, setData, loading, error, reload } = useAsyncData(fetchCourse);

    const updateCourse = useCallback(
        (updater) => {
            setData((prev) =>
                typeof updater === "function" ? updater(prev) : updater
            );
        },
        [setData]
    );

    return { course: data, loading, error, reload, updateCourse };
};
