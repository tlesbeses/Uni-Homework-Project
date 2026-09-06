import { useEditAssignmentForm } from "@/features/assignments/hooks/useEditAssignmentForm";
import { InputField } from "@/shared/components/ui/InputField";
import { TextareaField } from "@/shared/components/ui/TextareaField";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";

export const EditAssignmentModal = ({ assignment, open, onClose, onSaved }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useEditAssignmentForm({ assignment, onSuccess: onSaved });

    if (!open || !assignment) {
        return null;
    }

    return (
        <Modal open={open} title="Editar asignación" onClose={onClose}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-6 space-y-4"
                noValidate
            >
                    <InputField
                        label="Título"
                        name="title"
                        register={register}
                        error={errors.title?.message}
                        placeholder="Tarea 1"
                    />

                    <TextareaField
                        label="Descripción"
                        name="description"
                        register={register}
                        rows={3}
                        error={errors.description?.message}
                    />

                    <InputField
                        label="Puntaje máximo"
                        name="max_score"
                        type="number"
                        step="0.01"
                        register={register}
                        error={errors.max_score?.message}
                        placeholder="100"
                    />

                    <InputField
                        label="Peso en la nota final (opcional, por defecto 1)"
                        name="weight"
                        type="number"
                        step="0.01"
                        register={register}
                        error={errors.weight?.message}
                        placeholder="1"
                    />

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Fecha límite (opcional)
                        </label>
                        <input
                            type="datetime-local"
                            {...register("due_date")}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("is_published")}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                            Publicada
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={onClose} variant="ghost">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </div>
                </form>
        </Modal>
    );
};
