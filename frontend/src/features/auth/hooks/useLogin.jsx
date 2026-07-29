import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { loginRequest } from "@/features/auth/services/authService";
import { loginSchema } from "@/features/auth/schemas/authSchemas";

export const useLogin = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            const response = await loginRequest(data);
            await login(response);
            navigate("/dashboard", { replace: true });
        } catch (error) {
            const message = error.response?.data?.message || "Usuario o contraseña incorrectos";
            setServerError(message);
            console.error(error.response?.data);
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