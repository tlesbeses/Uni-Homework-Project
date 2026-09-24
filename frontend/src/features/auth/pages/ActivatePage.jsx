import { Link } from "react-router-dom";
import { useActivate } from "@/features/auth/hooks/useActivate";
import { Button } from "@/shared/components/ui/Button";

export const ActivatePage = () => {
    const { state, errorMessage } = useActivate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-indigo-600 px-8 py-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wide">
                        EduNotas
                    </h1>
                    <p className="text-indigo-100 text-sm mt-1">
                        Verificación de cuenta
                    </p>
                </div>

                <div className="p-8 text-center space-y-4">
                    {state === "loading" && (
                        <div className="flex flex-col items-center gap-4">
                            <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-sm text-gray-600">
                                Verificando tu cuenta...
                            </p>
                        </div>
                    )}

                    {state === "success" && (
                        <>
                            <p className="text-lg font-semibold text-gray-800">
                                ¡Cuenta verificada!
                            </p>
                            <p className="text-sm text-gray-600">
                                Tu cuenta fue activada correctamente. Ya podés
                                iniciar sesión.
                            </p>
                            <Button
                                as={Link}
                                to="/login"
                                size="lg"
                                className="w-full"
                            >
                                Iniciar sesión
                            </Button>
                        </>
                    )}

                    {state === "error" && (
                        <>
                            <p className="text-lg font-semibold text-red-600">
                                No se pudo verificar la cuenta
                            </p>
                            <p className="text-sm text-gray-600">
                                {errorMessage}
                            </p>
                            <Link
                                to="/login"
                                className="inline-block text-indigo-600 font-semibold hover:underline"
                            >
                                Volver al inicio de sesión
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};