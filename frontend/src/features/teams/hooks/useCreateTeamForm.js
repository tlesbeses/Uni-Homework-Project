import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createTeamSchema } from "@/features/teams/schemas/teamSchemas";
import { createTeam } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useCreateTeamForm = ({ onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(createTeamSchema),
        defaultValues: {
            name: "",
            course_id: "",
            leader_id: "",
        },
    });

    const onSubmit = async (data) => {
        try {
            await createTeam(data);
            toast.success("Equipo creado con éxito");
            reset();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit, watch, setValue };
};
