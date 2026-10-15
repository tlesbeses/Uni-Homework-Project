import { Link } from "react-router-dom";
import { LEGAL_UPDATED_AT, LEGAL_VERSION } from "../constants";

/**
 * Marco tipográfico compartido por los documentos legales (Términos y
 * Privacidad). Se sirve como página pública, sin layout de la app.
 */
export const LegalDoc = ({ title, intro, children }) => (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
        <article className="mx-auto w-full max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <Link
                    to="/"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                >
                    ← Volver al inicio
                </Link>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Versión {LEGAL_VERSION}
                </span>
            </div>

            <h1 className="mb-1 text-3xl font-bold text-gray-800">{title}</h1>
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

/** Sección de un documento legal con su encabezado. */
export const LegalSection = ({ heading, children }) => (
    <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-800">{heading}</h2>
        <div className="space-y-2 text-sm leading-relaxed text-gray-700">
            {children}
        </div>
    </section>
);
