import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { editTeamSchema } from "@/features/teams/schemas/teamSchemas";
import { updateTeam } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useEditTeamForm = ({ team, onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(editTeamSchema),
        defaultValues: {
            name: team?.name ?? "",
        },
    });

    useEffect(() => {
        if (team) {
            reset({ name: team.name });
        }
    }, [team, reset]);

    const onSubmit = async (data) => {
        try {
            await updateTeam(team.id, data);
            toast.success("Equipo actualizado con éxito");
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
