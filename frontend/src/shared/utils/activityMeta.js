// Metadatos compartidos para el historial de actividad (dashboard y consola
// admin). Centraliza las etiquetas/estilos de acciones y entidades y arma las
// líneas de detalle a partir del event_type + metadata que emite el backend.

export const ACTION_LABELS = {
    impersonate: "Impersonación",
    update: "Actualización",
    create: "Creación",
    delete: "Eliminación",
    login: "Inicio de sesión",
};

export const ACTION_STYLES = {
    impersonate: "bg-violet-100 text-violet-700",
    update: "bg-sky-100 text-sky-700",
    create: "bg-emerald-100 text-emerald-700",
    delete: "bg-red-100 text-red-700",
    login: "bg-amber-100 text-amber-700",
};

export const ENTITY_TYPE_LABELS = {
    user: "Usuario",
    grade: "Nota",
    course: "Curso",
    section: "Grupo de clase",
    enrollment: "Inscripción",
    team: "Equipo",
    assignment: "Tarea",
    system: "Sistema",
};

export function actionLabel(action) {
    return ACTION_LABELS[action] ?? action;
}

export function actionStyle(action) {
    return ACTION_STYLES[action] ?? "bg-gray-100 text-gray-700";
}

export function entityTypeLabel(entityType) {
    return ENTITY_TYPE_LABELS[entityType] ?? (entityType || "Sistema");
}

export function userName(user) {
    if (!user) {
        return null;
    }
    const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return full || user.username || null;
}

export function actorName(log) {
    return userName(log?.actor) ?? "Sistema";
}

export function targetName(log) {
    return userName(log?.target);
}

const FIELD_LABELS = {
    title: "Título",
    visibility: "Visibilidad",
    is_active: "Activo",
    role: "Rol",
    section_name: "Sección",
    description: "Descripción",
};

function fieldLabel(field) {
    return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

function valueLabel(value, field) {
    if (value === undefined || value === null || value === "") {
        return "—";
    }
    if (typeof value === "boolean") {
        return value ? "Sí" : "No";
    }
    if (field === "visibility") {
        return value === "PRIVATE" ? "Privado" : "Público";
    }
    return String(value);
}

function changeLines(changes) {
    if (!changes || typeof changes !== "object") {
        return [];
    }
    return Object.entries(changes)
        .filter(([, change]) => change && typeof change === "object")
        .map(
            ([field, change]) =>
                `${fieldLabel(field)}: ${valueLabel(change.from, field)} → ${valueLabel(change.to, field)}`
        );
}

export function activityDetailLines(log) {
    const meta = log?.metadata ?? {};
    const lines = [];

    const entity = log?.entity_type;
    if (entity === "grade") {
        if (meta.score !== undefined && meta.score !== null) {
            lines.push(`Nota: ${meta.score}`);
        }
        if (meta.assignment_id !== undefined && meta.assignment_id !== null) {
            lines.push(`Tarea #${meta.assignment_id}`);
        }
        if (meta.team_name) {
            lines.push(`Equipo: ${meta.team_name}`);
        }
        if (meta.is_individual) {
            lines.push("Individual");
        }
        if (meta.affected !== undefined && meta.affected !== null) {
            lines.push(`Miembros: ${meta.affected}`);
        } else if (Array.isArray(meta.member_ids)) {
            lines.push(`Miembros: ${meta.member_ids.length}`);
        }
    } else if (entity === "user") {
        if (log?.action === "impersonate") {
            if (meta.admin_id !== undefined && meta.admin_id !== null) {
                lines.push(`Admin #${meta.admin_id}`);
            }
        } else {
            lines.push(...changeLines(meta.changes));
        }
    } else if (entity === "course") {
        if (meta.title) {
            lines.push(`Título: ${meta.title}`);
        }
        if (log?.action === "create" && meta.visibility) {
            lines.push(`Visibilidad: ${valueLabel(meta.visibility, "visibility")}`);
        }
        lines.push(...changeLines(meta.changes));
    } else if (entity === "enrollment") {
        if (meta.course_id !== undefined && meta.course_id !== null) {
            lines.push(`Curso #${meta.course_id}`);
        }
        if (meta.student_id !== undefined && meta.student_id !== null) {
            lines.push(`Estudiante #${meta.student_id}`);
        }
        if (meta.status) {
            lines.push(`Estado: ${meta.status}`);
        }
    } else if (entity === "section") {
        if (meta.section_name) {
            lines.push(`Nombre: ${meta.section_name}`);
        }
        lines.push(...changeLines(meta.changes));
    } else if (entity === "assignment") {
        if (meta.title) {
            lines.push(`Título: ${meta.title}`);
        }
        lines.push(...changeLines(meta.changes));
    }

    return lines;
}