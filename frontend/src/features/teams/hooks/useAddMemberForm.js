import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { addMemberSchema } from "@/features/teams/schemas/teamSchemas";
import { addTeamMember } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useAddMemberForm = ({ teamId, onSuccess } = {}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(addMemberSchema),
        defaultValues: {
            student_id: "",
        },
    });

    const onSubmit = async (data) => {
        try {
            await addTeamMember(teamId, data.student_id);
            toast.success("Estudiante agregado al equipo");
            reset();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { register, handleSubmit, errors, isSubmitting, onSubmit };
};
