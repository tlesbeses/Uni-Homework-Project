import { useJoinCourseForm } from "@/features/courses/hooks/useJoinEnrollments";
import { InputField } from "@/shared/components/ui/InputField";

export const JoinCourseForm = ({ onJoined }) => {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
        pendingSections,
        selectedSectionId,
        setSelectedSectionId,
    } = useJoinCourseForm({ onSuccess: onJoined });

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col sm:flex-row sm:items-end gap-3"
            noValidate
        >
            <div className="flex-1">
                <InputField
                    label="Código de inscripción"
                    name="join_code"
                    register={register}
                    error={errors.join_code?.message}
                    placeholder="AB12CD34"
                />
            </div>

            {pendingSections && (
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Sección
                    </label>
                    <select
                        value={selectedSectionId}
                        onChange={(event) =>
                            setSelectedSectionId(event.target.value)
                        }
                        className="w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    >
                        <option value="">Selecciona una sección...</option>
                        {pendingSections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-lg transition disabled:opacity-60"
            >
                {isSubmitting ? "Uniendo..." : "Unirse al curso"}
            </button>
        </form>
    );
};
