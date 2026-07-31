import { z } from "zod";

export const userSchema = z.object({
    username: z.string().min(3, "Mínimo 3 caracteres"),
    first_name: z.string().min(2, "El nombre es obligatorio"),
    last_name: z.string().min(2, "El apellido es obligatorio"),
    email: z.string().email("Correo inválido"),
});

export const userPasswordSchema = z.object({
    current_password: z.string().min(1, "La contraseña actual es obligatoria"),
    new_password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"]
});
