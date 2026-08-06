import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { joinCourseSchema } from "@/features/courses/schemas/courseSchemas";
import { joinCourseByCode } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useJoinCourseForm = ({ onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(joinCourseSchema),
        defaultValues: { join_code: "" },
    });

    const onSubmit = async (data) => {
        try {
            await joinCourseByCode(data.join_code);
            toast.success("Solicitud de inscripción enviada");
            reset();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
