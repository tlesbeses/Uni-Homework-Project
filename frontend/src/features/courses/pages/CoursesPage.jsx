import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { CourseCard } from "@/features/courses/components/CourseCard";
import { CreateCourseModal } from "@/features/courses/components/CreateCourseModal";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { JoinCourseForm } from "@/features/courses/components/JoinCourseForm";
import { deleteCourse } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const CoursesPage = () => {
    const { isTeacher } = useAuth();
    const { courses, loading, error, loadCourses } = useCourses();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);

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
                        {isTeacher
                            ? "Gestiona tus cursos y códigos de inscripción."
                            : "Explora cursos públicos o únete con un código."}
                    </p>
                </div>

                {isTeacher && (
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition"
                    >
                        + Nuevo curso
                    </button>
                )}
            </div>

            {!isTeacher && (
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
                        isTeacher={isTeacher}
                        onDelete={handleDelete}
                        onEdit={setEditingCourse}
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

            <EditCourseModal
                course={editingCourse}
                open={Boolean(editingCourse)}
                onClose={() => setEditingCourse(null)}
                onSaved={async () => {
                    await loadCourses();
                    setEditingCourse(null);
                }}
            />
        </div>
    );
};
