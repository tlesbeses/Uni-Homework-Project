import { z } from "zod";

export const assignmentFormSchema = z.object({
    title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
    description: z
        .string()
        .max(2000, "La descripción es demasiado larga")
        .optional(),
    max_score: z.coerce
        .number()
        .positive("La nota máxima debe ser mayor a 0"),
    due_date: z.string().optional(),
    is_published: z.boolean(),
});
