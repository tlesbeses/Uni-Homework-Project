import { useEditCourseForm } from "@/features/courses/hooks/useEditCourseForm";
import { InputField } from "@/shared/components/ui/InputField";
import { SelectField } from "@/shared/components/ui/SelectField";
import { TextareaField } from "@/shared/components/ui/TextareaField";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";

export const EditCourseModal = ({ course, open, onClose, onSaved }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useEditCourseForm({ course, onSuccess: onSaved });

    if (!open || !course) {
        return null;
    }

    return (
        <Modal open={open} title="Editar curso" onClose={onClose}>
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
                        placeholder="Matemáticas I"
                    />

                    <TextareaField
                        label="Descripción"
                        name="description"
                        register={register}
                        rows={3}
                        placeholder="Contenido del curso..."
                        error={errors.description?.message}
                    />

                    <SelectField
                        label="Visibilidad"
                        name="visibility"
                        register={register}
                        error={errors.visibility?.message}
                    >
                        <option value="PRIVATE">
                            Privado (solo por código)
                        </option>
                        <option value="PUBLIC">
                            Público (visible para estudiantes)
                        </option>
                    </SelectField>

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
