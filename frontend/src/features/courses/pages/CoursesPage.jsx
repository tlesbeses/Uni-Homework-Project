import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { CourseCard } from "@/features/courses/components/CourseCard";
import { CreateCourseModal } from "@/features/courses/components/CreateCourseModal";
import { JoinCourseForm } from "@/features/courses/components/JoinCourseForm";
import { deleteCourse } from "@/features/courses/services/courseService";
import { isTeacher } from "@/shared/untils/roles";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const CoursesPage = () => {
    const { user } = useAuth();
    const teacher = isTeacher(user);
    const { courses, loading, error, loadCourses } = useCourses();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const handleDelete = async (courseId) => {
        if (!window.confirm("¿Eliminar este curso y todas sus inscripciones?")) {
            return;
        }
        setDeletingId(courseId);
        try {
            await deleteCourse(courseId);
            toast.success("Curso eliminado");
            await loadCourses();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cursos</h1>
                    <p className="text-sm text-gray-500">
                        {teacher
                            ? "Gestiona tus cursos y códigos de inscripción."
                            : "Explora cursos públicos o únete con un código."}
                    </p>
                </div>

                {teacher && (
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition"
                    >
                        + Nuevo curso
                    </button>
                )}
            </div>

            {!teacher && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <JoinCourseForm onJoined={loadCourses} />
                </div>
            )}

            {loading && <p className="text-gray-500">Cargando cursos...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && courses.length === 0 && (
                <p className="text-gray-500">No hay cursos disponibles.</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <CourseCard
                        key={course.id}
                        course={course}
                        isTeacher={teacher}
                        onDelete={handleDelete}
                        deleting={deletingId === course.id}
                    />
                ))}
            </div>

            <CreateCourseModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={async () => {
                    await loadCourses();
                    setIsCreateOpen(false);
                }}
            />
        </div>
    );
};
