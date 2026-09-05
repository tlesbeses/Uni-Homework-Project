import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
} from "@/features/notifications/hooks/useNotificationActions";
import { notificationMeta } from "@/shared/utils/notificationMeta";
import { Pager } from "@/shared/components/Pager";

function formatDate(value) {
    if (!value) {
        return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const NotificationsPage = () => {
    const navigate = useNavigate();
    const {
        notifications,
        count,
        page,
        totalPages,
        setPage,
        unreadOnly,
        setUnreadOnly,
        loading,
        error,
    } = useNotifications();

    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();

    const handleOpenNotification = (notification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        const meta = notificationMeta(notification);
        navigate(meta.route(notification.payload));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Notificaciones
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Admisiones aprobadas, solicitudes de ingreso y nuevas
                    calificaciones.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setUnreadOnly(!unreadOnly);
                        setPage(1);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        unreadOnly
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                    Solo no leídas
                </button>
                <span className="text-sm text-gray-400">
                    {count} notificación{count !== 1 ? "es" : ""}
                </span>
                <span className="flex-1" />
                {count > 0 && (
                    <button
                        type="button"
                        onClick={() => markAll.mutate()}
                        disabled={markAll.isPending}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition"
                    >
                        {markAll.isPending ? "Marcando..." : "Marcar todas leídas"}
                    </button>
                )}
            </div>

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {loading && notifications.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-gray-400">
                        Cargando...
                    </p>
                ) : notifications.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-gray-400">
                        {unreadOnly
                            ? "No tienes notificaciones sin leer."
                            : "No tienes notificaciones."}
                    </p>
                ) : (
                    notifications.map((notification) => {
                        const meta = notificationMeta(notification);
                        return (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() =>
                                    handleOpenNotification(notification)
                                }
                                className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-indigo-50/50 focus-visible:bg-indigo-50/50 outline-none transition-colors"
                            >
                                <span
                                    className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                                        notification.is_read
                                            ? "bg-gray-300"
                                            : "bg-indigo-500"
                                    }`}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
                                        >
                                            {meta.label}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {formatDate(notification.created_at)}
                                        </span>
                                    </span>
                                    <span className="mt-1 block text-sm text-gray-700">
                                        {meta.message(notification.payload)}
                                    </span>
                                </span>
                            </button>
                        );
                    })
                )}
            </div>

            <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
};