import { useCallback, useEffect, useState } from "react";
import { getCourses } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const PAGE_SIZE = 9;

export const usePaginatedCourses = () => {
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

    const loadPage = useCallback(async (targetPage) => {
        setLoading(true);
        setError("");
        try {
            const data = await getCourses({
                page: targetPage,
                page_size: PAGE_SIZE,
            });
            const items = Array.isArray(data.results)
                ? data.results
                : Array.isArray(data)
                  ? data
                  : [];
            setCourses(items);
            setCount(
                typeof data.count === "number" ? data.count : items.length
            );
            if (items.length === 0 && targetPage > 1) {
                setPage(targetPage - 1);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPage(page);
    }, [loadPage, page]);

    const reload = useCallback(() => loadPage(page), [loadPage, page]);

    return { courses, page, totalPages, setPage, loading, error, reload };
};
