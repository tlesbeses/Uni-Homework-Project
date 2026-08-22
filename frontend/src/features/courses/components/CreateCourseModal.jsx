import { useCreateCourseForm } from "@/features/courses/hooks/useCreateCourseForm";
import { InputField } from "@/shared/components/ui/InputField";

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

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Descripción
                        </label>
                        <textarea
                            {...register("description")}
                            rows={3}
                            placeholder="Contenido del curso..."
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Visibilidad
                        </label>
                        <select
                            {...register("visibility")}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="PRIVATE">
                                Privado (solo por código)
                            </option>
                            <option value="PUBLIC">
                                Público (visible para estudiantes)
                            </option>
                        </select>
                        {errors.visibility && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.visibility.message}
                            </p>
                        )}
                    </div>

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
                            {isSubmitting ? "Creando..." : "Crear curso"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
