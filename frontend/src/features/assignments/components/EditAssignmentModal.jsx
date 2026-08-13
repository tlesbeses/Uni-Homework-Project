import { useEditAssignmentForm } from "@/features/assignments/hooks/useEditAssignmentForm";
import { InputField } from "@/shared/components/ui/InputField";

export const EditAssignmentModal = ({ assignment, open, onClose, onSaved }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useEditAssignmentForm({ assignment, onSuccess: onSaved });

    if (!open || !assignment) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Editar asignación
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
                        placeholder="Tarea 1"
                    />

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Descripción
                        </label>
                        <textarea
                            {...register("description")}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {errors.description?.message && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <InputField
                        label="Puntaje máximo"
                        name="max_score"
                        type="number"
                        step="0.01"
                        register={register}
                        error={errors.max_score?.message}
                        placeholder="100"
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
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
