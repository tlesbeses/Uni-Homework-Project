export const hasRole = (user, role) =>
    Boolean(user?.roles?.includes(role));

export const isTeacher = (user) => hasRole(user, "Teacher");

export const isStudent = (user) => hasRole(user, "Student");
