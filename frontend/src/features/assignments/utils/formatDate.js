const pad = (n) => String(n).padStart(2, "0");

export const toDateTimeLocal = (value) => {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateTime = (value) => {
    if (!value) {
        return "Sin fecha límite";
    }
    return new Date(value).toLocaleString("es", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};
