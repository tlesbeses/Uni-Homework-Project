import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-toastify";
import { userPasswordSchema } from "@/features/auth/schemas/userSchemas";
import { changeUserPassword } from "@/features/auth/services/userService";

export const useUserPasswordForm = () => {
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(userPasswordSchema)
    });

    const onSubmit = async ({ confirm_password: _, ...passwordData }) => {
        setServerError("");
        try {
            await changeUserPassword(passwordData);
            toast.success("Contraseña actualizada con éxito");
            reset();
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
