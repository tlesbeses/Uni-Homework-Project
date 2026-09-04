import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { assignmentFormSchema } from "@/features/assignments/schemas/assignmentSchemas";
import { updateAssignment } from "@/features/assignments/services/assignmentService";
import { toDateTimeLocal } from "@/features/assignments/utils/formatDate";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEditAssignmentForm = ({ assignment, onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: {
            title: assignment?.title ?? "",
            description: assignment?.description ?? "",
            max_score: assignment?.max_score ?? "",
            weight: assignment?.weight ?? "",
            due_date: toDateTimeLocal(assignment?.due_date),
            is_published: assignment?.is_published ?? false,
        },
    });

    useEffect(() => {
        if (assignment) {
            reset({
                title: assignment.title,
                description: assignment.description,
                max_score: assignment.max_score,
                weight: assignment.weight,
                due_date: toDateTimeLocal(assignment.due_date),
                is_published: assignment.is_published,
            });
        }
    }, [assignment, reset]);

    const onSubmit = async (data) => {
        try {
            await updateAssignment(assignment.id, {
                title: data.title,
                description: data.description ?? "",
                max_score: data.max_score,
                weight: data.weight === "" ? undefined : data.weight,
                due_date: data.due_date
                    ? new Date(data.due_date).toISOString()
                    : null,
                is_published: data.is_published,
            });
            toast.success("Asignación actualizada con éxito");
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
