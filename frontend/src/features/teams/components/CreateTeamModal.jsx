import { useEffect } from "react";
import { useCreateTeamForm } from "@/features/teams/hooks/useCreateTeamForm";
import { InputField } from "@/shared/components/ui/InputField";
import { formatUser } from "@/features/teams/utils/formatUser";

const sectionLabel = (section) =>
    section ? `${section.course?.title ?? "Curso"} — ${section.name}` : "";

export const CreateTeamModal = ({
    open,
    onClose,
    onCreated,
    courses,
    enrollments,
    teams,
    sections,
    isTeacher,
    userId,
}) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit, watch, setValue } =
        useCreateTeamForm({ onSuccess: onCreated, isTeacher });

    const selectedSectionId = watch("section_id");

    useEffect(() => {
        if (isTeacher) {
            setValue("leader_id", "");
        }
    }, [selectedSectionId, isTeacher, setValue]);

    if (!open) {
        return null;
    }

    // Teachers pick among all the sections of their courses; students
    // among the sections of the courses where they are approved, excluding
    // those where they already belong to a team (a student can only be in
    // one team per section).
    const approvedSections = (
        isTeacher
            ? []
            : (enrollments ?? [])
                  .filter((enrollment) => enrollment.status === "APPROVED")
                  .map((enrollment) => enrollment.section)
                  .filter(Boolean)
    );
    const ownTeamSectionIds = new Set(
        (teams ?? [])
            .filter(
                (team) =>
                    team.leader?.id === userId ||
                    (team.members ?? []).some(
                        (member) => member.student?.id === userId
                    )
            )
            .map((team) => team.section?.id)
    );

    const sectionOptions = isTeacher
        ? (sections ?? [])
        : approvedSections.filter(
              (section) => !ownTeamSectionIds.has(section.id)
          );

    const selectedSection = sectionOptions.find(
        (section) => section.id === Number(selectedSectionId)
    );
    const selectedCourseId = selectedSection?.course?.id;

    const courseEnrollments = (enrollments ?? []).filter(
        (enrollment) =>
            enrollment.section?.id === Number(selectedSectionId) &&
            enrollment.status === "APPROVED"
    );
    const takenStudentIds = new Set(
        (teams ?? [])
            .filter(
                (team) => team.section?.course?.id === selectedCourseId
            )
            .flatMap((team) => (team.members ?? []).map((member) => member.student.id))
    );
    const leaders = courseEnrollments.filter(
        (enrollment) => !takenStudentIds.has(enrollment.student.id)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Nuevo equipo
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none transition"
                    >
                        &times;
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-6 space-y-4"
                    noValidate
                >
                    <InputField
                        label="Nombre"
                        name="name"
                        register={register}
                        error={errors.name?.message}
                        placeholder="Equipo A"
                    />

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Sección
                        </label>
                        <select
                            {...register("section_id")}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Selecciona una sección...</option>
                            {(sectionOptions ?? []).map((section) => (
                                <option key={section.id} value={section.id}>
                                    {sectionLabel(section)}
                                </option>
                            ))}
                        </select>
                        {errors.section_id && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.section_id.message}
                            </p>
                        )}
                        {!isTeacher && approvedSections.length === 0 && (
                            <p className="text-gray-500 text-xs mt-1">
                                Aún no estás aprobado en ningún curso.
                            </p>
                        )}
                        {!isTeacher &&
                            approvedSections.length > 0 &&
                            sectionOptions.length === 0 && (
                                <p className="text-gray-500 text-xs mt-1">
                                    Ya perteneces a un equipo en todas tus
                                    secciones.
                                </p>
                            )}
                    </div>

                    {isTeacher && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Líder
                            </label>
                            <select
                                {...register("leader_id")}
                                className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">
                                    {selectedSectionId
                                        ? "Selecciona un líder..."
                                        : "Primero selecciona una sección"}
                                </option>
                                {(leaders ?? []).map((enrollment) => (
                                    <option
                                        key={enrollment.student.id}
                                        value={enrollment.student.id}
                                    >
                                        {formatUser(enrollment.student)}
                                    </option>
                                ))}
                            </select>
                            {errors.leader_id && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.leader_id.message}
                                </p>
                            )}
                            {selectedSectionId && leaders.length === 0 && (
                                <p className="text-gray-500 text-xs mt-1">
                                    No hay estudiantes disponibles para ser líder.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-60"
                        >
                            {isSubmitting ? "Creando..." : "Crear equipo"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
