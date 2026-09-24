import { Link } from "react-router-dom";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";

export const ResetPasswordPage = () => {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        onSubmit,
    } = useResetPassword();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-indigo-600 px-8 py-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wide">
                        EduNotas
                    </h1>
                    <p className="text-indigo-100 text-sm mt-1">
                        Nueva contraseña
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-8 space-y-5"
                    noValidate
                >
                    <InputField
                        label="Contraseña nueva"
                        name="newPassword"
                        type="password"
                        register={register}
                        error={errors.newPassword?.message}
                        placeholder="••••••••"
                    />

                    <InputField
                        label="Confirmar contraseña"
                        name="confirmPassword"
                        type="password"
                        register={register}
                        error={errors.confirmPassword?.message}
                        placeholder="••••••••"
                    />

                    {serverError && (
                        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            {serverError}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="lg"
                        className="w-full"
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : "Restablecer contraseña"}
                    </Button>
                </form>

                <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
                    <p className="text-sm text-gray-600">
                        <Link
                            to="/login"
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            Volver al inicio de sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};