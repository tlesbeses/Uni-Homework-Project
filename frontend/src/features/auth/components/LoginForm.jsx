import { useLogin } from "@/features/auth/hooks/useLogin";
import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";

export const LoginForm = () => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } = useLogin();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5" noValidate>
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

            <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full"
            >
                {isSubmitting ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
        </form>
    );
};