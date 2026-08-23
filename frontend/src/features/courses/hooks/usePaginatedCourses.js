import { useCallback, useEffect, useState } from "react";
import { getCourses } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 10;

export const usePaginatedCourses = () => {
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const loadPage = useCallback(async (targetPage, size) => {
        setLoading(true);
        setError("");
        try {
            const data = await getCourses({
                page: targetPage,
                page_size: size,
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
        loadPage(page, pageSize);
    }, [loadPage, page, pageSize]);

    const reload = useCallback(
        () => loadPage(page, pageSize),
        [loadPage, page, pageSize]
    );

    const handlePageSizeChange = useCallback((size) => {
        setPageSize(size);
        setPage(1);
    }, []);

    return {
        courses,
        page,
        totalPages,
        setPage,
        pageSize,
        onPageSizeChange: handlePageSizeChange,
        loading,
        error,
        reload,
    };
};
