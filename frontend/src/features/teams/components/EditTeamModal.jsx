import { useEditTeamForm } from "@/features/teams/hooks/useEditTeamForm";
import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";

export const EditTeamModal = ({ team, open, onClose, onSaved }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useEditTeamForm({ team, onSuccess: onSaved });

    if (!open || !team) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Editar equipo
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

                    <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={onClose} variant="ghost">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
