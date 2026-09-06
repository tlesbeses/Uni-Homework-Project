import { useEditTeamForm } from "@/features/teams/hooks/useEditTeamForm";
import { InputField } from "@/shared/components/ui/InputField";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";

export const EditTeamModal = ({ team, open, onClose, onSaved }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useEditTeamForm({ team, onSuccess: onSaved });

    if (!open || !team) {
        return null;
    }

    return (
        <Modal open={open} title="Editar equipo" onClose={onClose}>
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
        </Modal>
    );
};
