import { useCallback, useEffect, useState } from "react";
import { getCourses } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadCourses = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getCourses();
            setCourses(data.results ?? data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    return { courses, loading, error, loadCourses };
};
