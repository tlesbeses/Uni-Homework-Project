import { z } from "zod";

export const registerSchema = z.object({
    username: z.string().min(3, "Mínimo 3 caracteres"),
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"]
});

