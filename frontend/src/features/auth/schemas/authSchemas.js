import { z } from "zod";

export const registerSchema = z.object({
    username: z.string().min(3, "Mínimo 3 caracteres"),
    first_name: z.string().min(2, "El nombre es obligatorio"),
    last_name: z.string().min(2, "El apellido es obligatorio"),
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"]
});

export const loginSchema = z.object({
    username: z.string().min(1, "El usuario es obligatorio"),
    password: z.string().min(1, "La contraseña es obligatoria")
});