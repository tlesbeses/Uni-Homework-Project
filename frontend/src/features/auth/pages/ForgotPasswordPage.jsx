import { Link } from "react-router-dom";
import { useForgotPassword } from "@/features/auth/hooks/useForgotPassword";
import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";

export const ForgotPasswordPage = () => {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        sent,
        onSubmit,
    } = useForgotPassword();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-indigo-600 px-8 py-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wide">
                        EduNotas
                    </h1>
                    <p className="text-indigo-100 text-sm mt-1">
                        Recuperar contraseña
                    </p>
                </div>

                {sent ? (
                    <div className="p-8 space-y-4 text-center">
                        <p className="text-lg font-semibold text-gray-800">
                            Revisá tu correo
                        </p>
                        <p className="text-sm text-gray-600">
                            Si existe una cuenta con ese email, recibirás un
                            enlace para restablecer tu contraseña. Revisá
                            también la carpeta de spam.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block mt-2 text-indigo-600 font-semibold hover:underline"
                        >
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="p-8 space-y-5"
                        noValidate
                    >
                        <p className="text-sm text-gray-600">
                            Ingresá el email de tu cuenta y te enviaremos un
                            enlace para crear una contraseña nueva.
                        </p>

                        <InputField
                            label="Correo electrónico"
                            name="email"
                            type="email"
                            register={register}
                            error={errors.email?.message}
                            placeholder="correo@ejemplo.com"
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
                                ? "Enviando..."
                                : "Enviar enlace"}
                        </Button>
                    </form>
                )}

                <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
                    <p className="text-sm text-gray-600">
                        ¿Recordaste tu contraseña?{" "}
                        <Link
                            to="/login"
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};