import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { registerSchema } from "@/features/auth/schemas/authSchemas";
import { registerUser } from "@/features/auth/services/authService";
import { toast } from "react-toastify";

export const useRegister = () => {
    const [registered, setRegistered] = useState(false);
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(registerSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            const payload = { ...data };
            delete payload.confirmPassword;
            await registerUser(payload);
            setRegistered(true);
            toast.success(
                "Usuario registrado. Revisá tu correo para activar tu cuenta."
            );
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
                toast.error("Error inesperado del servidor");
            }

        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        registered,
        onSubmit
    };
};