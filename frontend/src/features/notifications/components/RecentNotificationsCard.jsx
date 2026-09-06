import { Link } from "react-router-dom";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { notificationMeta } from "@/shared/utils/notificationMeta";

const PREVIEW = 5;

function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) {
        return "Ahora mismo";
    }
    if (diffMins < 60) {
        return `Hace ${diffMins} min`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
        return `Hace ${diffHours}h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    }
    return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
    });
}

export function RecentNotificationsCard() {
    const { notifications, count } = useNotifications();
    const items = notifications.slice(0, PREVIEW);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Notificaciones
                </h2>
                {count > 0 && (
                    <Link
                        to="/notifications"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        Ver todas →
                    </Link>
                )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {items.length === 0 && (
                    <p className="px-5 py-8 text-center text-gray-400 text-sm">
                        No tienes notificaciones.
                    </p>
                )}
                {items.map((notification) => {
                    const meta = notificationMeta(notification);
                    return (
                        <Link
                            key={notification.id}
                            to={meta.route(notification.payload)}
                            className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                        >
                            <span
                                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                    notification.is_read
                                        ? "bg-gray-300"
                                        : "bg-indigo-500"
                                }`}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${meta.badge}`}
                                    >
                                        {meta.label}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatRelativeTime(
                                            notification.created_at
                                        )}
                                    </span>
                                </span>
                                <span className="mt-0.5 block text-sm text-gray-700 line-clamp-2">
                                    {meta.message(notification.payload)}
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}