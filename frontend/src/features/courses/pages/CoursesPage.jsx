import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { usePaginatedCourses } from "@/features/courses/hooks/usePaginatedCourses";
import { useDeleteCourse } from "@/features/courses/hooks/useCourseMutations";
import { CourseCard } from "@/features/courses/components/CourseCard";
import { CreateCourseModal } from "@/features/courses/components/CreateCourseModal";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { JoinCourseForm } from "@/features/courses/components/JoinCourseForm";
import { Pager } from "@/shared/components/Pager";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

export const CoursesPage = () => {
    const { isTeacher, isStudent } = useAuth();
    const navigate = useNavigate();
    const {
        courses,
        page,
        totalPages,
        setPage,
        loading,
        error,
        reload,
    } = usePaginatedCourses();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);

    const deleteMutation = useDeleteCourse();

    const confirmDelete = async () => {
        const courseId = pendingDelete;
        setPendingDelete(null);
        setDeletingId(courseId);
        try {
            await deleteMutation.mutateAsync(courseId);
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
                    <JoinCourseForm onJoined={reload} />
                </div>
            )}

            {loading && <p className="text-gray-500">Cargando cursos...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (courses ?? []).length === 0 && (
                <p className="text-gray-500">No hay cursos disponibles.</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <CourseCard
                        key={course.id}
                        course={course}
                        isTeacher={isTeacher}
                        isStudent={isStudent}
                        onDelete={setPendingDelete}
                        onEdit={setEditingCourse}
                        deleting={deletingId === course.id}
                    />
                ))}
            </div>

            {!loading && !error && (
                <Pager page={page} totalPages={totalPages} onChange={setPage} />
            )}

            <CreateCourseModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={async (createdCourse) => {
                    await reload();
                    setIsCreateOpen(false);
                    if (createdCourse?.id) {
                        navigate(`/courses/${createdCourse.id}`);
                    }
                }}
            />

            <EditCourseModal
                course={editingCourse}
                open={Boolean(editingCourse)}
                onClose={() => setEditingCourse(null)}
                onSaved={async () => {
                    await reload();
                    setEditingCourse(null);
                }}
            />

            <ConfirmModal
                open={Boolean(pendingDelete)}
                title="Eliminar curso"
                description="¿Eliminar este curso y todas sus inscripciones? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                busy={Boolean(deletingId)}
            />
        </div>
    );
};
