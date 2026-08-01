const STYLES = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

const LABELS = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
};

export const StatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            STYLES[status] ?? "bg-gray-100 text-gray-700"
        }`}
    >
        {LABELS[status] ?? status}
    </span>
);
