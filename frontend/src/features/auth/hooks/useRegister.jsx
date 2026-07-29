import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerSchema } from "@/features/auth/schemas/authSchemas";
import { authApi } from "@/features/auth/services/authService";

export const useRegister = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(registerSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            await authApi.register(data);
            navigate("/login");
        } catch (err) {
            const message = err.response?.data?.message || "Error al crear la cuenta";
            setServerError(message);
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