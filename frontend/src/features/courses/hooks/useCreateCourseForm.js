import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createCourseSchema } from "@/features/courses/schemas/courseSchemas";
import { createCourse } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCreateCourseForm = ({ onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(createCourseSchema),
        defaultValues: {
            title: "",
            section_name: "",
            description: "",
            visibility: "PRIVATE",
        },
    });

    const onSubmit = async (data) => {
        try {
            const created = await createCourse(data);
            toast.success("Curso creado con éxito");
            reset();
            onSuccess?.(created);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
