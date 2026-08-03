import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-toastify";
import { userSchema } from "@/features/auth/schemas/userSchemas";
import { updateUserProfile } from "@/features/auth/services/authService";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { userStorage } from "@/shared/storage/tokenStorage";
export const useUserForm = () => {
    const [serverError, setServerError] = useState("");
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(userSchema),
        defaultValues: {
            username: user?.username || "",
            first_name: user?.first_name || "",
            last_name: user?.last_name || "",
            email: user?.email || ""
        }
    });

    const onSubmit = async (data) => {
        setServerError("");
        try {
            await updateUserProfile(data);
            toast.success("Perfil actualizado con éxito");
            user.username = data.username;
            user.first_name = data.first_name;
            user.last_name = data.last_name;
            user.email = data.email;
            userStorage.setUser(user);
            navigate("/dashboard");

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
