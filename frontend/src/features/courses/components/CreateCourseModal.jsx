import { useCreateCourseForm } from "@/features/courses/hooks/useCreateCourseForm";
import { InputField } from "@/shared/components/ui/InputField";
import { SelectField } from "@/shared/components/ui/SelectField";
import { TextareaField } from "@/shared/components/ui/TextareaField";
import { Button } from "@/shared/components/ui/Button";

export const CreateCourseModal = ({ open, onClose, onCreated }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useCreateCourseForm({ onSuccess: onCreated });

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Nuevo curso
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
                        label="Título"
                        name="title"
                        register={register}
                        error={errors.title?.message}
                        placeholder="Matemáticas I"
                    />

                    <InputField
                        label="Sección inicial"
                        name="section_name"
                        register={register}
                        error={errors.section_name?.message}
                        placeholder="1TS1"
                        helpText="El curso se creará con esta sección por defecto."
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
                            {isSubmitting ? "Creando..." : "Crear curso"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
