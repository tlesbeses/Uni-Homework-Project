const DEFAULT_MESSAGE = "Ocurrió un error inesperado.";
const NETWORK_MESSAGE = "No se pudo conectar con el servidor. Revisa tu conexión.";

// Etiquetas legibles para los campos más comunes que devuelve el backend.
const FIELD_LABELS = {
    detail: "",
    non_field_errors: "",
    title: "Título",
    description: "Descripción",
    visibility: "Visibilidad",
    section_name: "Sección",
    section_id: "Sección",
    section: "Sección",
    name: "Nombre",
    course_id: "Curso",
    course: "Curso",
    leader_id: "Líder",
    leader: "Líder",
    student: "Estudiante",
    join_code: "Código",
    members: "Miembros",
};

// Mensajes por código HTTP cuando el backend no envía un cuerpo útil.
const STATUS_MESSAGES = {
    400: "Revisa los datos enviados.",
    401: "Tu sesión expiró. Inicia sesión de nuevo.",
    403: "No tienes permiso para realizar esta acción.",
    404: "El recurso solicitado no existe.",
    409: "La operación entra en conflicto con el estado actual.",
};

function prettifyField(field) {
    return field
        .replace(/_/g, " ")
        .replace(/^\w/, (char) => char.toUpperCase());
}

function extractMessage(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.map(extractMessage).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
        return Object.values(value)
            .map(extractMessage)
            .filter(Boolean)
            .join(", ");
    }
    return "";
}

// Formatea errores tipo DRF: {"campo": ["msg"]} / {"detail": "msg"}.
function formatDataErrors(data) {
    return Object.entries(data)
        .map(([field, value]) => {
            const message = extractMessage(value);
            if (!message) {
                return "";
            }
            const label =
                FIELD_LABELS[field] ?? prettifyField(field);
            return label ? `${label}: ${message}` : message;
        })
        .filter(Boolean)
        .join(" · ");
}

export function getErrorMessage(error) {
    // Sin respuesta del servidor (internet caído, timeout, CORS, etc.).
    if (!error?.response) {
        if (error?.code === "ECONNABORTED") {
            return "El servidor tardó demasiado en responder. Intenta de nuevo.";
        }
        return NETWORK_MESSAGE;
    }

    const { status, data } = error.response;

    let message = "";
    if (typeof data === "string") {
        message = data.trim();
    } else if (data !== null && typeof data === "object") {
        message = formatDataErrors(data);
    }

    if (!message) {
        if (status >= 500) {
            message = "Error interno del servidor. Intenta más tarde.";
        } else {
            message = STATUS_MESSAGES[status] ?? DEFAULT_MESSAGE;
        }
    }

    return message || DEFAULT_MESSAGE;
}
