export const DOT_COLORS = [
    "bg-red-500",
    "bg-orange-400",
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-yellow-400",
    "bg-teal-500",
    "bg-pink-500",
];

export const studentName = (student) =>
    `${student.first_name || student.username} ${student.last_name ?? ""}`
        .trim()
        .replace(/\s+/g, " ");

export const studentInitials = (student) => {
    const first = (student.first_name || student.username || "?").trim();
    const last = (student.last_name ?? "").trim();
    return `${first[0] ?? "?"}${last[0] ?? ""}`.toUpperCase();
};

export const formatScore = (score) =>
    score === null || score === undefined ? "__" : String(score);

export const teamDraftKey = (teamId) => `t:${teamId}`;
export const memberDraftKey = (teamId, studentId) => `m:${teamId}:${studentId}`;
export const unteamedDraftKey = (studentId) => `u:${studentId}`;