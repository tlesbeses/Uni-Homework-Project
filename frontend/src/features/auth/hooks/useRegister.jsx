import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerSchema } from "@/features/auth/schemas/authSchemas";
import { registerUser } from "@/features/auth/services/authService";

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
            const data = error.response?.data;
            Object.entries(data).forEach(([field, messages]) => {
                setError(field, {
                    type: "server",
                    message: messages[0]
                });
            });
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