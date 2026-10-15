import { Link } from "react-router-dom";
import { InputField } from "@/shared/components/ui/InputField";
import { Checkbox } from "@/shared/components/ui/Checkbox";
import { Button } from "@/shared/components/ui/Button";
import { useRegister } from "../hooks/useRegister";

export const RegisterForm = () => {
    const { register, handleSubmit, errors, isSubmitting, registered, onSubmit } = useRegister();

    if (registered) {
        return (
            <div className="space-y-4 text-center">
                <p className="text-lg font-semibold text-gray-800">
                    Revisá tu correo
                </p>
                <p className="text-sm text-gray-600">
                    Te enviamos un enlace para activar tu cuenta. Ingresá en él
                    antes de iniciar sesión y revisá también la carpeta de spam.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>

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

            <Checkbox
                name="acceptTerms"
                register={register}
                error={errors.acceptTerms?.message}
                label={
                    <>
                        He leído y acepto los{" "}
                        <Link
                            to="/terms"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-indigo-600 hover:underline"
                        >
                            Términos y Condiciones
                        </Link>{" "}
                        y la{" "}
                        <Link
                            to="/privacy"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-indigo-600 hover:underline"
                        >
                            Política de Privacidad
                        </Link>
                        .
                    </>
                }
            />

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
            >
                {isSubmitting ? "Creando cuenta..." : "Registrarse"}
            </Button>
        </form>
    );
};