import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { forgotPasswordSchema } from "@/features/auth/schemas/authSchemas";
import { requestPasswordReset } from "@/features/auth/services/authService";

export const useForgotPassword = () => {
    const [sent, setSent] = useState(false);
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            await requestPasswordReset(data.email);
            setSent(true);
        } catch (error) {
            const status = error.response?.status;
            let message =
                "Error al enviar la solicitud. Inténtalo de nuevo.";
            if (status === 429) {
                message =
                    "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
            } else if (!error.response) {
                message = "No se pudo conectar con el servidor.";
            }
            setServerError(message);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        sent,
        onSubmit,
    };
};