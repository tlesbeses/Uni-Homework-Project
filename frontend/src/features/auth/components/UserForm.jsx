import { InputField } from "@/shared/components/ui/InputField";
import { useUserForm } from "../hooks/useUserForm";

export const UserForm = () => {
    const { register, handleSubmit, errors, isSubmitting, serverError, onSubmit } = useUserForm();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-3" noValidate>

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

            {serverError && (
                <p className="text-red-500 text-xs">{serverError}</p>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
        </form>
    );
};
