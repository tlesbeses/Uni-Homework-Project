import { useEffect, useState } from "react";
import { getUserProfile } from "@/features/auth/services/authService";

export function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const data = await getUserProfile();
                setUser(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    if (loading) {
        return <div>Cargando...</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">
                {user ? `Bienvenido, ${user.username}` : "Bienvenido al Panel de Control"}
            </h1>
            <p className="text-gray-600">
                Aquí verás el resumen de tus alumnos y calificaciones.
            </p>
        </div>
    );
}