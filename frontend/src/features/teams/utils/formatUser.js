export const formatUser = (user) => {
    if (!user) {
        return "Desconocido";
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fullName || user.username || "Desconocido";
};
