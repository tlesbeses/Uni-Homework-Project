import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AssignmentSection } from "@/features/assignments/components/AssignmentSection";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { AutoAcceptToggle } from "@/features/courses/components/AutoAcceptToggle";
import { CourseDetailHeader } from "@/features/courses/components/CourseDetailHeader";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { EnrollmentSection } from "@/features/courses/components/EnrollmentSection";
import { SectionSection } from "@/features/courses/components/SectionSection";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { useCourseSettings } from "@/features/courses/hooks/useCourseSettings";

export const CourseDetailPage = () => {
    const { id } = useParams();
    const { user, isTeacher } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { course, loading, error, reload, updateCourse } = useCourse(id);
    const { toggleAutoAccept } = useCourseSettings({ course, updateCourse });

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
    const isOwner = isTeacher && course.teacher?.id === user?.id;
     
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
                teacher={isTeacher}
                isOwner={isOwner}
                onEdit={() => setIsEditOpen(true)}
            />

            {isTeacher && (
                <AutoAcceptToggle
                    checked={autoAccept}
                    onChange={toggleAutoAccept}
                />
            )}

            {isOwner && (
                <SectionSection courseId={id} />
            )}

            <EnrollmentSection
                courseId={id}
                teacher={isTeacher}
                course={course}
                reloadCourse={reload}
            />

            <AssignmentSection
                courseId={id}
                isTeacher={isTeacher}
                isOwner={isOwner}
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
