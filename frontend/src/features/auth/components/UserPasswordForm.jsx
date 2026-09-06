import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";
import { useUserPasswordForm } from "../hooks/useUserPasswordForm";

export const UserPasswordForm = () => {
    const { register, handleSubmit, errors, isSubmitting, serverError, onSubmit } = useUserPasswordForm();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5" noValidate>

            <InputField
                label="Contraseña actual"
                name="current_password"
                type="password"
                register={register}
                error={errors.current_password?.message}
                placeholder="••••••••"
            />

            <InputField
                label="Nueva contraseña"
                name="new_password"
                type="password"
                register={register}
                error={errors.new_password?.message}
                placeholder="••••••••"
            />

            <InputField
                label="Confirmar nueva contraseña"
                name="confirm_password"
                type="password"
                register={register}
                error={errors.confirm_password?.message}
                placeholder="••••••••"
            />

            {serverError && (
                <p className="text-red-500 text-xs">{serverError}</p>
            )}

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
            >
                {isSubmitting ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
        </form>
    );
};
