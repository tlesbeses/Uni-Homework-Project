import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { loginSchema } from "@/features/auth/schemas/authSchemas";
import { toast } from "react-toastify";

export const useLogin = () => {
    const { login } = useAuth(); // Nuestra única fuente de verdad para la autenticación
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

            await login(data);

            toast.success("Inicio de sesión exitoso");
            navigate("/dashboard", { replace: true });
        } catch (error) {
            // Si el contexto falló al llamar a la API, capturamos el error aquí para la interfaz
            const message = "Usuario o contraseña incorrectos";
            setServerError(message);
            toast.error(message);
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
