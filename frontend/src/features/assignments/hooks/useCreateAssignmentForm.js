import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { assignmentFormSchema } from "@/features/assignments/schemas/assignmentSchemas";
import { createAssignment } from "@/features/assignments/services/assignmentService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCreateAssignmentForm = ({ courseId, onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: {
            title: "",
            description: "",
            max_score: "",
            weight: "",
            due_date: "",
            is_published: true,
        },
    });

    const onSubmit = async (data) => {
        try {
            await createAssignment({
                course: courseId,
                title: data.title,
                description: data.description ?? "",
                max_score: data.max_score,
                weight: data.weight === "" ? undefined : data.weight,
                due_date: data.due_date
                    ? new Date(data.due_date).toISOString()
                    : null,
                is_published: data.is_published,
            });
            toast.success("Asignación creada con éxito");
            reset();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
