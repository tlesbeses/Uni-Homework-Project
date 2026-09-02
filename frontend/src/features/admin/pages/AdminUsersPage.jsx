import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import {
    setUserActive,
    setUserRole,
} from "@/features/admin/services/adminService";
import { SearchInput } from "@/shared/components/SearchInput";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { formatUser } from "@/features/teams/utils/formatUser";

const ROLE_STYLES = {
    Teacher: "bg-indigo-100 text-indigo-700",
    Student: "bg-emerald-100 text-emerald-700",
    Superuser: "bg-amber-100 text-amber-700",
};

function formatDate(value) {
    if (!value) {
        return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export const AdminUsersPage = () => {
    const navigate = useNavigate();
    const { user: currentUser, startImpersonation } = useAuth();
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [impersonatingId, setImpersonatingId] = useState(null);
    const [pendingDeactivate, setPendingDeactivate] = useState(null);

    const { users, loading, error, reload } = useAdminUsers({ search, role });

    const sortedUsers = useMemo(
        () =>
            [...users].sort((a, b) => {
                if (a.is_superuser !== b.is_superuser) {
                    return a.is_superuser ? -1 : 1;
                }
                return 0;
            }),
        [users]
    );

    const handleToggleActive = (targetUser) => {
        if (targetUser.is_active) {
            setPendingDeactivate(targetUser);
        } else {
            activateUser(targetUser);
        }
    };

    const activateUser = async (targetUser) => {
        setBusyId(targetUser.id);
        try {
            await setUserActive(targetUser.id, true);
            toast.success(`Cuenta de ${formatUser(targetUser)} reactivada.`);
            await reload();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const confirmDeactivate = async () => {
        const targetUser = pendingDeactivate;
        if (!targetUser) {
            return;
        }
        setPendingDeactivate(null);
        setBusyId(targetUser.id);
        try {
            await setUserActive(targetUser.id, false);
            toast.success(
                `Cuenta de ${formatUser(targetUser)} desactivada.`
            );
            await reload();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const handleRoleChange = async (targetUser) => {
        const nextRole = targetUser.roles.includes("Teacher")
            ? "Student"
            : "Teacher";
        setBusyId(targetUser.id);
        try {
            await setUserRole(targetUser.id, nextRole);
            toast.success(
                nextRole === "Teacher"
                    ? `${formatUser(targetUser)} ahora es Profesor.`
                    : `${formatUser(targetUser)} ahora es Estudiante.`
            );
            await reload();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const handleImpersonate = async (targetUser) => {
        setImpersonatingId(targetUser.id);
        const ok = await startImpersonation(targetUser);
        setImpersonatingId(null);
        if (ok) {
            toast.success(
                `Probando el sistema como ${formatUser(targetUser)}.`
            );
            navigate("/dashboard");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Usuarios
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Administra cuentas, roles y acceso de los usuarios del
                        sistema.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-72">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por nombre, usuario o email..."
                    />
                </div>
                <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="sm:w-48 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                    <option value="">Todos los roles</option>
                    <option value="Teacher">Profesores</option>
                    <option value="Student">Estudiantes</option>
                </select>
            </div>

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Usuario</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Rol</th>
                            <th className="px-5 py-3">Estado</th>
                            <th className="px-5 py-3">Alta</th>
                            <th className="px-5 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && users.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    Cargando usuarios...
                                </td>
                            </tr>
                        )}
                        {!loading && users.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                        {sortedUsers.map((u) => {
                            const isSelf = u.id === currentUser?.id;
                            const busy = busyId === u.id;
                            const impersonating = impersonatingId === u.id;
                            const roleKey = u.is_superuser
                                ? "Superuser"
                                : u.roles.includes("Teacher")
                                  ? "Teacher"
                                  : "Student";
                            return (
                                <tr
                                    key={u.id}
                                    className={
                                        u.is_active ? "" : "bg-gray-50"
                                    }
                                >
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-gray-800">
                                            {formatUser(u)}
                                            {isSelf && (
                                                <span className="ml-2 text-xs text-gray-400">
                                                    (tú)
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            @{u.username}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {u.email || "—"}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[roleKey]}`}
                                        >
                                            {u.is_superuser
                                                ? "Superusuario"
                                                : u.roles.includes("Teacher")
                                                  ? "Profesor"
                                                  : "Estudiante"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                                u.is_active
                                                    ? "text-emerald-600"
                                                    : "text-red-500"
                                            }`}
                                        >
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    u.is_active
                                                        ? "bg-emerald-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                            {u.is_active
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {formatDate(u.date_joined)}
                                    </td>
                                    <td className="px-5 py-3">
                                        {u.is_superuser ? (
                                            <p className="text-right text-xs text-gray-400">
                                                Sin acciones
                                            </p>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleToggleActive(u)
                                                    }
                                                    disabled={busy}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
                                                        u.is_active
                                                            ? "text-red-600 border-red-200 hover:bg-red-50"
                                                            : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    }`}
                                                >
                                                    {u.is_active
                                                        ? "Desactivar"
                                                        : "Activar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRoleChange(u)
                                                    }
                                                    disabled={busy}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition disabled:opacity-50"
                                                >
                                                    {u.roles.includes(
                                                        "Teacher"
                                                    )
                                                        ? "Hacer estudiante"
                                                        : "Hacer profesor"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleImpersonate(u)
                                                    }
                                                    disabled={
                                                        busy ||
                                                        impersonating
                                                    }
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                                                >
                                                    {impersonating
                                                        ? "Probando..."
                                                        : "Probar como"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pendingDeactivate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 animate-pop">
                        <h2 className="text-lg font-bold text-gray-800">
                            Desactivar cuenta
                        </h2>
                        <p className="text-sm text-gray-600 mt-2">
                            ¿Desactivar la cuenta de{" "}
                            <strong>{formatUser(pendingDeactivate)}</strong>?
                            El usuario no podrá iniciar sesión ni ser
                            impersonado; sus datos se conservan.
                        </p>
                        <div className="flex justify-end gap-3 pt-5">
                            <button
                                type="button"
                                onClick={() => setPendingDeactivate(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeactivate}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                            >
                                Desactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};