import { useState } from "react";
import { useResendActivation } from "@/features/auth/hooks/useResendActivation";
import { InputField } from "@/shared/components/ui/InputField";
import { Button } from "@/shared/components/ui/Button";

export const ResendActivationBlock = ({
    triggerText = "¿No te llegó el correo? Reenviar",
    className = "px-8 pb-6",
}) => {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        sent,
        onSubmit,
    } = useResendActivation();
    const [open, setOpen] = useState(false);

    if (sent) {
        return (
            <div className={`${className} text-center`}>
                <p className="text-sm text-gray-600">
                    Si existe una cuenta sin activar con ese email, te
                    enviamos un nuevo enlace. Revisá también el spam.
                </p>
            </div>
        );
    }

    return (
        <div className={`${className} text-center`}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="text-sm text-indigo-600 font-medium hover:underline"
            >
                {triggerText}
            </button>

            {open && (
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="mt-3 space-y-3 text-left"
                    noValidate
                >
                    <InputField
                        label="Correo electrónico"
                        name="email"
                        type="email"
                        register={register}
                        error={errors.email?.message}
                        placeholder="correo@ejemplo.com"
                    />

                    {serverError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {serverError}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="md"
                        className="w-full"
                    >
                        {isSubmitting ? "Enviando..." : "Reenviar enlace"}
                    </Button>
                </form>
            )}
        </div>
    );
};