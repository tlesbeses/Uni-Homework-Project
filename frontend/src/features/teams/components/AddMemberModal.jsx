import { useEffect, useState } from "react";
import { useAddMemberForm } from "@/features/teams/hooks/useAddMemberForm";
import { getAvailableStudents } from "@/features/teams/services/teamService";
import { formatUser } from "@/features/teams/utils/formatUser";
import { Button } from "@/shared/components/ui/Button";
import { SelectField } from "@/shared/components/ui/SelectField";

const toList = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

export const AddMemberModal = ({ team, open, onClose, onAdded }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useAddMemberForm({ teamId: team?.id, onSuccess: onAdded });
    const [enrollments, setEnrollments] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    useEffect(() => {
        if (!open || !team?.id) {
            return;
        }
        let active = true;
        setLoadingCandidates(true);
        setEnrollments([]);
        getAvailableStudents(team.id)
            .then((data) => {
                if (active) {
                    setEnrollments(toList(data));
                }
            })
            .catch(() => {
                if (active) {
                    setEnrollments([]);
                }
            })
            .finally(() => {
                if (active) {
                    setLoadingCandidates(false);
                }
            });
        return () => {
            active = false;
        };
    }, [open, team?.id]);

    if (!open || !team) {
        return null;
    }

    const memberIds = new Set((team.members ?? []).map((member) => member.student.id));
    const candidates = enrollments.filter(
        (enrollment) =>
            enrollment.status === "APPROVED" &&
            !memberIds.has(enrollment.student.id)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Agregar miembro
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
                    <SelectField
                        label="Estudiante"
                        name="student_id"
                        register={register}
                        error={errors.student_id?.message}
                    >
                        <option value="">Selecciona un estudiante...</option>
                        {(candidates ?? []).map((enrollment) => (
                            <option
                                key={enrollment.student.id}
                                value={enrollment.student.id}
                            >
                                {formatUser(enrollment.student)}
                            </option>
                        ))}
                    </SelectField>
                        {loadingCandidates && (
                            <p className="text-gray-500 text-xs mt-1">
                                Cargando estudiantes...
                            </p>
                        )}
                        {!loadingCandidates && candidates.length === 0 && (
                            <p className="text-gray-500 text-xs mt-1">
                                No hay estudiantes disponibles para agregar.
                            </p>
                        )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={onClose} variant="ghost">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                loadingCandidates ||
                                candidates.length === 0
                            }
                        >
                            {isSubmitting ? "Agregando..." : "Agregar miembro"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
