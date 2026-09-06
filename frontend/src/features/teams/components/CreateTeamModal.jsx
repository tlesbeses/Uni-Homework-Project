import { useEffect } from "react";
import { useCreateTeamForm } from "@/features/teams/hooks/useCreateTeamForm";
import { InputField } from "@/shared/components/ui/InputField";
import { SelectField } from "@/shared/components/ui/SelectField";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { formatUser } from "@/features/teams/utils/formatUser";

const sectionLabel = (section) =>
    section ? `${section.course?.title ?? "Curso"} — ${section.name}` : "";

export const CreateTeamModal = ({
    open,
    onClose,
    onCreated,
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
        <Modal open={open} title="Nuevo equipo" onClose={onClose}>
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
                        <SelectField
                            label="Sección"
                            name="section_id"
                            register={register}
                            error={errors.section_id?.message}
                        >
                            <option value="">Selecciona una sección...</option>
                            {(sectionOptions ?? []).map((section) => (
                                <option key={section.id} value={section.id}>
                                    {sectionLabel(section)}
                                </option>
                            ))}
                        </SelectField>
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
                        <div className="space-y-4">
                            <SelectField
                                label="Líder"
                                name="leader_id"
                                register={register}
                                error={errors.leader_id?.message}
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
                            </SelectField>
                            {selectedSectionId && leaders.length === 0 && (
                                <p className="text-gray-500 text-xs mt-1">
                                    No hay estudiantes disponibles para ser líder.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={onClose} variant="ghost">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creando..." : "Crear equipo"}
                        </Button>
                    </div>
                </form>
        </Modal>
    );
};
