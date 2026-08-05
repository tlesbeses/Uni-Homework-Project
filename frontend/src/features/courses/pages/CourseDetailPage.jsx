import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { AutoAcceptToggle } from "@/features/courses/components/AutoAcceptToggle";
import { CourseDetailHeader } from "@/features/courses/components/CourseDetailHeader";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { EnrollmentSection } from "@/features/courses/components/EnrollmentSection";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { useCourseSettings } from "@/features/courses/hooks/useCourseSettings";
import { isTeacher } from "@/shared/untils/roles";

export const CourseDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const teacher = isTeacher(user);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { course, loading, error, reload, updateCourse } = useCourse(id);
    const { toggleAutoAccept } = useCourseSettings(id, { course, updateCourse });

    if (loading) {
        return <p className="text-gray-500">Cargando curso...</p>;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!course) {
        return <p className="text-gray-500">Curso no encontrado.</p>;
    }

    const autoAccept = Boolean(course.settings?.auto_accept_students);
    const isOwner = teacher && course.teacher?.id === user?.id;

    return (
        <div className="space-y-6 max-w-4xl">
            <Link
                to="/courses"
                className="text-sm text-indigo-600 hover:text-indigo-800"
            >
                &larr; Volver a cursos
            </Link>

            <CourseDetailHeader
                course={course}
                teacher={teacher}
                isOwner={isOwner}
                onEdit={() => setIsEditOpen(true)}
            />

            {teacher && (
                <AutoAcceptToggle
                    checked={autoAccept}
                    onChange={toggleAutoAccept}
                />
            )}

            <EnrollmentSection
                courseId={id}
                teacher={teacher}
                course={course}
                reloadCourse={reload}
            />

            <EditCourseModal
                course={course}
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSaved={async () => {
                    await reload();
                    setIsEditOpen(false);
                }}
            />
        </div>
    );
};
