import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/authService";

export const LoginPage = () => {

    const { contextLogin, user } = useAuth();
    const [form, setForm] = useState({
        username: '',
        password: '',
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const data = await login(form);
            contextLogin(data);
            console.log("Login successful:", data);
            console.log("User profile:", user);

        } catch (error) {
            console.error(error.response?.data);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">


            <div className="bg-indigo-600 px-8 py-6 text-center">
                <h1 className="text-2xl font-bold text-white tracking-wide">EduNotas</h1>
                <p className="text-indigo-100 text-sm mt-1">Ingresa a tu panel de calificaciones</p>
            </div>


            <form onSubmit={handleSubmit} className="p-8 space-y-5" action="#" method="POST">


                <div>
                    <label for="userName" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Nombre de Usuario
                    </label>
                    <input
                        name="username"
                        required
                        value={form.username}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-700 text-sm"
                    />
                </div>


                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label for="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Contraseña
                        </label>
                        <a href="#" className="text-xs text-indigo-600 hover:underline font-medium">¿Olvidaste tu contraseña?</a>
                    </div>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-700 text-sm"
                    />
                </div>


                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="remember"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label for="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">Recordarme en este dispositivo</label>
                </div>


                <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Iniciar Sesión
                </button>

            </form>


            <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
                <p className="text-sm text-gray-600">
                    ¿Aún no tienes una cuenta?
                    <a href="#" className="text-indigo-600 font-semibold hover:underline">Registrarme gratis</a>
                </p>
            </div>

        </div>
    )
}