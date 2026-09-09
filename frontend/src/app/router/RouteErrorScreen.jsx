import { useEffect, useRef, useState } from "react";
import { useRouteError } from "react-router-dom";
import { reportErrorFromEvent } from "@/shared/utils/reportError";
import { Button } from "@/shared/components/ui/Button";

export function RouteErrorScreen() {
    const error = useRouteError();
    const [errorId, setErrorId] = useState("");
    const reported = useRef(false);

    useEffect(() => {
        if (reported.current) {
            return undefined;
        }
        reported.current = true;
        reportErrorFromEvent(error, "route").then((id) => {
            if (id) {
                setErrorId(id);
            }
        });
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <h1 className="text-xl font-bold text-gray-800">
                    Algo salió mal
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                    Ocurrió un error inesperado al cargar esta página. Recarga
                    para volver a intentarlo, o avisale al administrador con el
                    código de soporte.
                </p>
                {errorId && (
                    <p className="mt-3 text-xs text-gray-400">
                        Código de soporte:{" "}
                        <span className="font-mono text-indigo-600">
                            {errorId}
                        </span>
                    </p>
                )}
                <Button onClick={() => window.location.reload()} className="mt-6">
                    Recargar página
                </Button>
            </div>
        </div>
    );
}