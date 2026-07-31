import { InputField } from "@/shared/components/ui/InputField";
import { useRegister } from "../hooks/useRegister";

export const RegisterForm = () => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } = useRegister();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

            <InputField
                label="Nombre de usuario"
                name="username"
                register={register}
                error={errors.username?.message}
                placeholder="Tu usuario"
            />

            <InputField
                label="Nombre"
                name="first_name"
                register={register}
                error={errors.first_name?.message}
                placeholder="Tu nombre"
            />

            <InputField
                label="Apellido"
                name="last_name"
                register={register}
                error={errors.last_name?.message}
                placeholder="Tu apellido"
            />

            <InputField
                label="Correo electrónico"
                name="email"
                type="email"
                register={register}
                error={errors.email?.message}
                placeholder="correo@ejemplo.com"
            />

            <InputField
                label="Contraseña"
                name="password"
                type="password"
                register={register}
                error={errors.password?.message}
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

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
                {isSubmitting ? "Creando cuenta..." : "Registrarse"}
            </button>
        </form>
    );
};