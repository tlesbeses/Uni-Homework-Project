import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { enrollInCourse } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEnrollment = (courseId) => {
    const [enrolling, setEnrolling] = useState(false);

    const enroll = useCallback(
        async (sectionId) => {
            setEnrolling(true);
            try {
                await enrollInCourse(courseId, sectionId);
                toast.success("Solicitud de inscripción enviada");
                return true;
            } catch (err) {
                toast.error(getErrorMessage(err));
                return false;
            } finally {
                setEnrolling(false);
            }
        },
        [courseId]
    );

    return { enroll, enrolling };
};
