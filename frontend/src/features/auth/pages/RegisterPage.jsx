import { Link } from "react-router-dom";
import { RegisterForm } from "../components/RegisterForm";

export const RegisterPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                Crear Cuenta
            </h2>

            <RegisterForm />

            <p className="mt-6 text-center text-sm text-gray-600">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                    Inicia sesión
                </Link>
            </p>
        </div>
    </div>
);