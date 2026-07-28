import { Link } from "react-router-dom";

export const NotFoundPage = () => (
    <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-2">
            404
        </h1>

        <p className="mb-4">
            Página no encontrada.
        </p>

        <Link
            to="/"
            className="text-indigo-600 underline"
        >
            Volver al inicio
        </Link>
    </div>
);