// Metadatos de presentación de cada tipo de notificación: etiqueta, badge de
// color y ruta de navegación (leyendo el payload JSON que guarda el backend).
const NOTIFICATION_META = {
    grade_published: {
        label: "Nueva calificación",
        badge: "bg-indigo-50 text-indigo-700",
        route: (payload) => `/courses/${payload.course_id}`,
        message: (payload) =>
            `Recibiste la nota de "${payload.assignment_title}" en ${payload.course_title}.`,
    },
    enrollment_approved: {
        label: "Admisión aprobada",
        badge: "bg-emerald-50 text-emerald-700",
        route: (payload) => `/courses/${payload.course_id}`,
        message: (payload) =>
            `Tu solicitud para ingresar a "${payload.course_title}" (${payload.section_name}) fue aprobada.`,
    },
    enrollment_requested: {
        label: "Nueva solicitud",
        badge: "bg-amber-50 text-amber-700",
        route: (payload) => `/courses/${payload.course_id}`,
        message: (payload) =>
            `${payload.student_name} solicitó unirse a "${payload.course_title}" (${payload.section_name}).`,
    },
};

const FALLBACK_META = {
    label: "Notificación",
    badge: "bg-gray-50 text-gray-600",
    route: () => "/notifications",
    message: () => "Tienes una notificación nueva.",
};

export function notificationMeta(notification) {
    if (!notification || !notification.type) {
        return FALLBACK_META;
    }
    return NOTIFICATION_META[notification.type] ?? FALLBACK_META;
}