import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-toastify";
import { userSchema } from "@/features/auth/schemas/userSchemas";
import { updateUserProfile } from "@/features/auth/services/authService";

export const useUserForm = () => {
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(userSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            await updateUserProfile(data);
            toast.success("Perfil actualizado con éxito");
        } catch (error) {
            const serverData = error.response?.data;
            if (serverData && typeof serverData === 'object') {
                Object.entries(serverData).forEach(([field, messages]) => {
                    setError(field, {
                        type: "server",
                        message: Array.isArray(messages) ? messages[0] : messages
                    });
                });
            } else {
                setServerError("Error inesperado del servidor");
            }
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        onSubmit
    };
};
