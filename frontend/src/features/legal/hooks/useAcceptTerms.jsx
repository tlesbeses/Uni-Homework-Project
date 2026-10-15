import { useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/features/auth/providers/AuthProvider";
import { acceptTerms as acceptTermsRequest } from "@/features/auth/services/authService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

/**
 * Acepta la versión vigente de los Términos y Condiciones y actualiza el
 * perfil en memoria para que el modal de re-aceptación se cierre.
 */
export const useAcceptTerms = () => {
    const { updateUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const accept = async () => {
        setIsSubmitting(true);
        try {
            const updatedUser = await acceptTermsRequest();
            updateUser(updatedUser);
            toast.success("Términos y Condiciones aceptados.");
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { accept, isSubmitting };
};
