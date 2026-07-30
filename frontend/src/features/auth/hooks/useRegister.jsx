import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerSchema } from "@/features/auth/schemas/authSchemas";
import { registerUser } from "@/features/auth/services/authService";
import { toast } from "react-toastify";

export const useRegister = () => {
    const navigate = useNavigate();
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
            await registerUser(data);
            toast.success("Usuario registrado con éxito");
            navigate("/login");
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
        onSubmit
    };
};