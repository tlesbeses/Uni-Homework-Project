import { Link, useNavigate } from "react-router-dom";
import { LEGAL_UPDATED_AT, LEGAL_VERSION } from "../constants";

/**
 * Marco tipográfico compartido por los documentos legales (Términos y
 * Privacidad). Se sirve como página pública, sin layout de la app.
 *
 * Cuando la página se abrió desde la app en una pestaña propia (la app
 * enlaza con `target="_blank"` y `rel="opener"`), el control superior es un
 * botón "Volver" que cierra la pestaña y devuelve el foco a la ventana de
 * origen —así no queda una ventana huérfana—. Si el navegador bloquea el
 * cierre, se navega al inicio como fallback. Visitas directas (sin opener)
 * conservan el enlace "← Volver al inicio".
 */
export const LegalDoc = ({ title, intro, children }) => {
    const navigate = useNavigate();

    // La app enlaza con rel="opener": si hay opener, esta pestaña se abrió
    // desde la propia app y "Volver" debe cerrarla.
    const hasOpener =
        typeof window !== "undefined" &&
        Boolean(window.opener) &&
        !window.opener.closed;

    const handleBack = () => {
        try {
            window.opener?.focus();
        } catch {
            // Enfocar es best-effort; el cierre es lo importante.
        }
        window.close();
        // Si el navegador bloqueó el cierre, seguimos como enlace normal.
        if (!window.closed) {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10">
            <article className="mx-auto w-full max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                    {hasOpener ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="text-sm font-medium text-indigo-600 hover:underline"
                        >
                            ← Volver
                        </button>
                    ) : (
                        <Link
                            to="/"
                            className="text-sm font-medium text-indigo-600 hover:underline"
                        >
                            ← Volver al inicio
                        </Link>
                    )}
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        Versión {LEGAL_VERSION}
                    </span>
                </div>

                <h1 className="mb-1 text-3xl font-bold text-gray-800">
                    {title}
                </h1>
                <p className="mb-8 text-sm text-gray-500">
                    Última actualización: {LEGAL_UPDATED_AT}
                </p>

                {intro && (
                    <p className="mb-6 text-sm leading-relaxed text-gray-700">
                        {intro}
                    </p>
                )}

                <div className="space-y-6">{children}</div>
            </article>
        </div>
    );
};

/** Sección de un documento legal con su encabezado. */
export const LegalSection = ({ heading, children }) => (
    <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-800">{heading}</h2>
        <div className="space-y-2 text-sm leading-relaxed text-gray-700">
            {children}
        </div>
    </section>
);
