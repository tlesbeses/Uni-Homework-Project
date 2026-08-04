import { useEffect } from "react";
import { useCreateTeamForm } from "@/features/teams/hooks/useCreateTeamForm";
import { InputField } from "@/shared/components/ui/InputField";
import { formatUser } from "@/features/teams/utils/formatUser";

export const CreateTeamModal = ({
    open,
    onClose,
    onCreated,
    courses,
    enrollments,
    teams,
    isTeacher,
}) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit, watch, setValue } =
        useCreateTeamForm({ onSuccess: onCreated, isTeacher });

    const selectedCourseId = watch("course_id");

    useEffect(() => {
        if (isTeacher) {
            setValue("leader_id", "");
        }
    }, [selectedCourseId, isTeacher, setValue]);

    if (!open) {
        return null;
    }

    const approvedCourses = isTeacher
        ? courses
        : courses.filter((course) =>
              enrollments.some(
                  (enrollment) =>
                      enrollment.course.id === course.id &&
                      enrollment.status === "APPROVED"
              )
          );
    const courseId = Number(selectedCourseId);
    const courseEnrollments = enrollments.filter(
        (enrollment) =>
            enrollment.course.id === courseId && enrollment.status === "APPROVED"
    );
    const takenStudentIds = new Set(
        teams
            .filter((team) => team.course.id === courseId)
            .flatMap((team) => team.members.map((member) => member.student.id))
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
                            Curso
                        </label>
                        <select
                            {...register("course_id")}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Selecciona un curso...</option>
                            {approvedCourses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                        {errors.course_id && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.course_id.message}
                            </p>
                        )}
                        {!isTeacher && approvedCourses.length === 0 && (
                            <p className="text-gray-500 text-xs mt-1">
                                Aún no estás aprobado en ningún curso.
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
                                    {selectedCourseId
                                        ? "Selecciona un líder..."
                                        : "Primero selecciona un curso"}
                                </option>
                                {leaders.map((enrollment) => (
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
                            {selectedCourseId && leaders.length === 0 && (
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
