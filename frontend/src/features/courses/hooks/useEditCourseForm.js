import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createCourseSchema } from "@/features/courses/schemas/courseSchemas";
import { updateCourse } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEditCourseForm = ({ course, onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(createCourseSchema),
        defaultValues: {
            title: course?.title ?? "",
            description: course?.description ?? "",
            visibility: course?.visibility ?? "PRIVATE",
        },
    });

    useEffect(() => {
        if (course) {
            reset({
                title: course.title,
                description: course.description ?? "",
                visibility: course.visibility,
            });
        }
    }, [course, reset]);

    const onSubmit = async (data) => {
        try {
            await updateCourse(course.id, data);
            toast.success("Curso actualizado con éxito");
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
