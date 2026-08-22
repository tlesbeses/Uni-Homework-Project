import { TeacherGradingPanel } from "@/features/grades/components/TeacherGradingPanel";
import { StudentCourseGrades } from "@/features/grades/components/StudentCourseGrades";
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
                        : "Consulta tus calificaciones y el total acumulado por curso."}
                </p>
            </div>

            {isTeacher ? <TeacherGradingPanel /> : <StudentCourseGrades />}
        </div>
    );
};
