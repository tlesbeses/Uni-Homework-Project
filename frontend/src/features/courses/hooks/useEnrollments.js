import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import {
    approveEnrollment as approveEnrollmentRequest,
    getEnrollments,
    rejectEnrollment as rejectEnrollmentRequest,
} from "@/features/courses/services/courseService";
import { useAsyncData } from "@/features/courses/hooks/useAsyncData";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEnrollments = (courseId) => {
    const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null);

    const fetchEnrollments = useCallback(async () => {
        const data = await getEnrollments(courseId);
        return data.results ?? data;
    }, [courseId]);

    const { data, loading, error, reload } = useAsyncData(fetchEnrollments);

    const updateStatus = useCallback(
        async (enrollmentId, action) => {
            setUpdatingEnrollmentId(enrollmentId);
            try {
                if (action === "approve") {
                    await approveEnrollmentRequest(enrollmentId);
                    toast.success("Inscripción aprobada");

                } else {
                    await rejectEnrollmentRequest(enrollmentId);
                    toast.success("Inscripción rechazada");
                }

                //meter un delete de la inscripcion en el backend para que se pueda volver a inscribir
                await reload();
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setUpdatingEnrollmentId(null);
            }
        },
        [reload]
    );

    const approveEnrollment = useCallback(
        (enrollmentId) => updateStatus(enrollmentId, "approve"),
        [updateStatus]
    );

    const rejectEnrollment = useCallback(
        (enrollmentId) => updateStatus(enrollmentId, "reject"),
        [updateStatus]
    );

    return {
        enrollments: data ?? [],
        loading,
        error,
        reload,
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
    };
};
