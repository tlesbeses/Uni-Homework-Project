import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/features/notifications/hooks/useUnreadCount";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
} from "@/features/notifications/hooks/useNotificationActions";
import { getNotifications } from "@/features/notifications/services/notificationService";
import { notificationMeta } from "@/shared/utils/notificationMeta";

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

const BELL_ICON = (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
    />
  </svg>
);

export function NotificationBell() {
    const navigate = useNavigate();
    const { data: unreadCount = 0 } = useUnreadCount();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const bellRef = useRef(null);

    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const controller = new AbortController();
        setLoading(true);
        getNotifications({
            signal: controller.signal,
            page_size: 10,
        })
            .then((data) => setItems(Array.isArray(data.results) ? data.results : []))
            .catch(() => {})
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [open]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const handleClick = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleOpenNotification = (notification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        setOpen(false);
        const meta = notificationMeta(notification);
        navigate(meta.route(notification.payload));
    };

    return (
        <div className="relative" ref={bellRef}>
            <button
                onClick={() => {
                    setOpen((value) => !value);
                }}
                className={`relative text-indigo-200 hover:text-white hover:bg-white/10 p-2 rounded-lg transition ${
                    open ? "bg-white/10 text-white" : ""
                }`}
                aria-label="Notificaciones"
                title="Notificaciones"
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                {BELL_ICON}
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[0.65rem] font-bold leading-none tabular-nums">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden z-50 animate-pop">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Notificaciones
                        </p>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAll.mutate()}
                                disabled={markAll.isPending}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                                {markAll.isPending
                                    ? "Marcando..."
                                    : "Marcar todas"}
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1.5">
                        {loading && items.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-gray-400">
                                Cargando...
                            </p>
                        ) : items.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-gray-400">
                                No tienes notificaciones.
                            </p>
                        ) : (
                            items.map((notification) => {
                                const meta = notificationMeta(notification);
                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() =>
                                            handleOpenNotification(notification)
                                        }
                                        className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-indigo-50 focus-visible:bg-indigo-50 outline-none transition-colors"
                                    >
                                        <span
                                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
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
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="border-t border-gray-100 p-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                navigate("/notifications");
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:bg-indigo-50 outline-none transition-colors"
                        >
                            Ver todas las notificaciones
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}