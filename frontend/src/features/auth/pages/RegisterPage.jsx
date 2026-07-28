import { Link } from "react-router-dom";

export const RegisterPage = () => (
    <div className="bg-white p-6 rounded-xl shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">
            Crear Cuenta
        </h2>

        <Link
            to="/login"
            className="text-indigo-600 underline"
        >
            ¿Ya tienes cuenta? Inicia sesión
        </Link>
    </div>
);