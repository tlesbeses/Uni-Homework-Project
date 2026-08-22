import { TeacherGradingPanel } from "@/features/grades/components/TeacherGradingPanel";
import { StudentGradesList } from "@/features/grades/components/StudentGradesList";
import { useAuth } from "@/features/auth/providers/AuthProvider";

export const GradesPage = () => {
    const { isTeacher } = useAuth();

    return (
        <div
            className={`space-y-6 ${isTeacher ? "max-w-6xl" : "max-w-4xl"}`}
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Calificaciones
                </h1>
                <p className="text-sm text-gray-500">
                    {isTeacher
                        ? "Califica equipos o estudiantes individualmente por asignación."
                        : "Consulta las calificaciones de tus asignaciones."}
                </p>
            </div>

            {isTeacher ? <TeacherGradingPanel /> : <StudentGradesList />}
        </div>
    );
};
