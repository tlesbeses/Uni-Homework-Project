import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AssignmentSection } from "@/features/assignments/components/AssignmentSection";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { CourseDetailHeader } from "@/features/courses/components/CourseDetailHeader";
import { CourseDetailSidebar } from "@/features/courses/components/CourseDetailSidebar";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { EnrollmentSection } from "@/features/courses/components/EnrollmentSection";
import { QuickSettingsBar } from "@/features/courses/components/QuickSettingsBar";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { useCourseSettings } from "@/features/courses/hooks/useCourseSettings";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

export const CourseDetailPage = () => {
  const { id } = useParams();
  const { user, isTeacher } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const { course, loading, error, reload, updateCourse } = useCourse(id);
  const {
    savingField,
    toggleAutoAccept,
    toggleVisibility,
    pendingActive,
    setPendingActive,
    confirmToggleActive,
  } = useCourseSettings({ course, updateCourse });

  if (loading) {
    return <p className="text-gray-500">Cargando curso...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!course) {
    return <p className="text-gray-500">Curso no encontrado.</p>;
  }

  const isOwner = isTeacher && course.teacher?.id === user?.id;

  return (
    <div className={`space-y-6 ${isTeacher ? "max-w-6xl" : "max-w-4xl"}`}>
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

      {isTeacher ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <QuickSettingsBar
              course={course}
              savingField={savingField}
              onToggleAutoAccept={toggleAutoAccept}
              onToggleVisibility={toggleVisibility}
              onToggleActive={setPendingActive}
            />
            <AssignmentSection
              courseId={id}
              isTeacher={isTeacher}
              isOwner={isOwner}
              selectedSectionId={selectedSectionId}
            />
          </div>
          <aside className="space-y-6">
            <CourseDetailSidebar
              courseId={id}
              isOwner={isOwner}
              reloadCourse={reload}
              selectedSectionId={selectedSectionId}
              onSectionChange={setSelectedSectionId}
            />
          </aside>
        </div>
      ) : (
        <div className="space-y-6">
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
        </div>
      )}

      <EditCourseModal
        course={course}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={async () => {
          await reload();
          setIsEditOpen(false);
        }}
      />

      <ConfirmModal
        open={pendingActive}
        title={course.is_active ? "Deshabilitar curso" : "Habilitar curso"}
        description={
          course.is_active
            ? "¿Deshabilitar este curso? Los estudiantes dejarán de poder inscribirse y no aparecerá en la búsqueda, pero los datos se conservan."
            : "¿Habilitar este curso? Los estudiantes podrán volver a encontrarlo e inscribirse."
        }
        confirmLabel={course.is_active ? "Deshabilitar" : "Habilitar"}
        confirmClassName={
          course.is_active
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }
        onCancel={() => setPendingActive(false)}
        onConfirm={confirmToggleActive}
        busy={savingField === "is_active"}
      />
    </div>
  );
};
