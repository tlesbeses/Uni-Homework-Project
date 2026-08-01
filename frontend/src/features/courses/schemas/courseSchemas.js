import { z } from "zod";

export const createCourseSchema = z.object({
    title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
    description: z.string().max(2000, "La descripción es demasiado larga").optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"], {
        message: "Selecciona una visibilidad válida",
    }),
});

export const joinCourseSchema = z.object({
    join_code: z
        .string()
        .min(8, "El código tiene 8 caracteres")
        .max(8, "El código tiene 8 caracteres")
        .regex(/^[A-Z0-9]+$/, "Solo letras mayúsculas y números"),
});
