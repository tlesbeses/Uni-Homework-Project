import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import {
    createTeamSchema,
    studentCreateTeamSchema,
} from "@/features/teams/schemas/teamSchemas";
import { createTeam } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCreateTeamForm = ({ onSuccess, isTeacher } = {}) => {
    const schema = isTeacher ? createTeamSchema : studentCreateTeamSchema;
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            course_id: "",
            leader_id: "",
        },
    });

    const onSubmit = async (data) => {
        try {
            const payload = isTeacher
                ? data
                : { name: data.name, course_id: data.course_id };
            await createTeam(payload);
            toast.success("Equipo creado con éxito");
            reset();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit, watch, setValue };
};
