import { z } from "zod";

export const createTeamSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    course_id: z.coerce.number().min(1, "Selecciona un curso"),
    leader_id: z.coerce.number().min(1, "Selecciona un líder"),
});

export const editTeamSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
});

export const addMemberSchema = z.object({
    student_id: z.coerce.number().min(1, "Selecciona un estudiante"),
});
