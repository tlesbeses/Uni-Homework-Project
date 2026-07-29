import { useLogin } from "@/features/auth/hooks/useLogin";
import { InputField } from "@/shared/components/ui/InputField";

export const LoginForm = () => {
    const { register, handleSubmit, errors, isSubmitting, serverError, onSubmit } = useLogin();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5" noValidate>
            {serverError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
                    {serverError}
                </div>
            )}

            <InputField
                label="Nombre de Usuario"
                name="username"
                register={register}
                error={errors.username?.message}
                placeholder="Tu usuario"
            />

            <InputField
                label="Contraseña"
                name="password"
                type="password"
                register={register}
                error={errors.password?.message}
                placeholder="••••••••"
            />

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Ingresando..." : "Iniciar Sesión"}
            </button>
        </form>
    );
};