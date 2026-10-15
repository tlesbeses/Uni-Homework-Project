import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/providers/AuthProvider";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { needsTermsAcceptance } from "../utils";
import { useAcceptTerms } from "../hooks/useAcceptTerms";

/**
 * Modal bloqueante que aparece cuando el usuario debe (re)aceptar la versión
 * vigente de los Términos y Condiciones (p. ej. tras publicar una versión
 * nueva). No se puede cerrar sin aceptar; se omite durante la impersonación.
 */
export const TermsReacceptModal = () => {
    const { user, isImpersonating } = useAuth();
    const { accept, isSubmitting } = useAcceptTerms();

    const open = !isImpersonating && needsTermsAcceptance(user);
    if (!open) {
        return null;
    }

    return (
        <Modal open title="Actualizamos los Términos y Condiciones">
            <div className="space-y-4 p-6">
                <p className="text-sm leading-relaxed text-gray-600">
                    Publicamos una versión nueva de los{" "}
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
                    . Para seguir usando EduNotas, necesitás aceptarla.
                </p>

                <Button
                    className="w-full"
                    onClick={accept}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? "Guardando..."
                        : "Acepto los Términos y Condiciones"}
                </Button>
            </div>
        </Modal>
    );
};
