import { Link } from "react-router-dom";
import { UserPasswordForm } from "@/features/auth/components/UserPasswordForm";

export const ChangePasswordProfilePage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-indigo-600 px-8 py-6 text-center">
                <h1 className="text-2xl font-bold text-white tracking-wide">EduNotas</h1>
                <p className="text-indigo-100 text-sm mt-1">Ingresa a tu panel de calificaciones</p>
            </div>

            <UserPasswordForm />

            <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">

            </div>
        </div>
    </div>
);