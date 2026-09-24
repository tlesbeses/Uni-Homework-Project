import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { resetPasswordSchema } from "@/features/auth/schemas/authSchemas";
import { confirmPasswordReset } from "@/features/auth/services/authService";

export const useResetPassword = () => {
    const navigate = useNavigate();
    const { uid, token } = useParams();
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(resetPasswordSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            await confirmPasswordReset(uid, token, data.newPassword);
            toast.success(
                "Contraseña restablecida. Inicia sesión con la nueva contraseña."
            );
            navigate("/login");
        } catch (error) {
            const status = error.response?.status;
            let message =
                "El enlace es inválido o ya expiró. Solicita un nuevo restablecimiento de contraseña.";
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
        onSubmit,
    };
};