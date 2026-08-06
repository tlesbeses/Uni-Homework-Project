import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { enrollInCourse } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useEnrollment = (courseId) => {
    const [enrolling, setEnrolling] = useState(false);

    const enroll = useCallback(async () => {
        setEnrolling(true);
        try {
            await enrollInCourse(courseId);
            toast.success("Solicitud de inscripción enviada");
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err));
            return false;
        } finally {
            setEnrolling(false);
        }
    }, [courseId]);

    return { enroll, enrolling };
};
