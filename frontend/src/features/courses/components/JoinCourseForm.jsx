import { useJoinCourseForm } from "@/features/courses/hooks/useJoinCourseForm";
import { InputField } from "@/shared/components/ui/InputField";

export const JoinCourseForm = ({ onJoined }) => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
        useJoinCourseForm({ onSuccess: onJoined });

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

            <button
                type="submit"
                disabled={isSubmitting}
                className="sm:self-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-lg transition disabled:opacity-60"
            >
                {isSubmitting ? "Uniendo..." : "Unirse al curso"}
            </button>
        </form>
    );
};
