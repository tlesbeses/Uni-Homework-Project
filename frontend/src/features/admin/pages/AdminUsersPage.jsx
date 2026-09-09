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
import { Button } from "@/shared/components/ui/Button";
import { SelectField } from "@/shared/components/ui/SelectField";
import { Modal } from "@/shared/components/ui/Modal";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { formatUser } from "@/features/teams/utils/formatUser";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

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
    const [pendingRoleChange, setPendingRoleChange] = useState(null);

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

    const handleRoleChange = async () => {
        const targetUser = pendingRoleChange;
        const nextRole = targetUser.roles.includes("Teacher")
            ? "Student"
            : "Teacher";
        setPendingRoleChange(null);
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
        // Navegar ANTES de cambiar el perfil de usuario: la ruta actual
        // (/admin/users) tiene un guard superuserOnly; si cambiamos el
        // usuario estando aún en ella, el guard redirigiría a /403.
        navigate("/dashboard");
        setImpersonatingId(targetUser.id);
        const ok = await startImpersonation(targetUser);
        setImpersonatingId(null);
        if (ok) {
            toast.success(
                `Probando el sistema como ${formatUser(targetUser)}.`
            );
        } else {
            navigate("/admin/users");
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
                <SelectField
                    compact
                    className="sm:w-48"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    aria-label="Filtrar por rol"
                >
                    <option value="">Todos los roles</option>
                    <option value="Teacher">Profesores</option>
                    <option value="Student">Estudiantes</option>
                </SelectField>
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
                                                    className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                                                        u.is_active
                                                            ? "text-red-600 border-red-200 hover:bg-red-50"
                                                            : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    }`}
                                                >
                                                    {u.is_active
                                                        ? "Desactivar"
                                                        : "Activar"}
                                                </button>
                                                <Button
                                                    onClick={() =>
                                                        setPendingRoleChange(u)
                                                    }
                                                    disabled={busy}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {u.roles.includes(
                                                        "Teacher"
                                                    )
                                                        ? "Hacer estudiante"
                                                        : "Hacer profesor"}
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        handleImpersonate(u)
                                                    }
                                                    disabled={
                                                        busy ||
                                                        impersonating
                                                    }
                                                    size="sm"
                                                    variant="secondary"
                                                >
                                                    {impersonating
                                                        ? "Probando..."
                                                        : "Probar como"}
                                                </Button>
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
                <Modal
                    open
                    title="Desactivar cuenta"
                    onClose={() => setPendingDeactivate(null)}
                    size="md"
                >
                    <div className="p-6">
                        <p className="text-sm text-gray-600">
                            ¿Desactivar la cuenta de{" "}
                            <strong>{formatUser(pendingDeactivate)}</strong>?
                            El usuario no podrá iniciar sesión ni ser
                            impersonado; sus datos se conservan.
                        </p>
                        <div className="flex justify-end gap-3 pt-5">
                            <Button
                                variant="ghost"
                                onClick={() => setPendingDeactivate(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={confirmDeactivate}
                            >
                                Desactivar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmModal
                open={Boolean(pendingRoleChange)}
                title="Cambiar rol de usuario"
                description={
                    pendingRoleChange
                        ? `¿Cambiar el rol de ${formatUser(
                              pendingRoleChange
                          )} a ${
                              pendingRoleChange.roles.includes("Teacher")
                                  ? "Estudiante"
                                  : "Profesor"
                          }?`
                        : ""
                }
                confirmLabel="Cambiar rol"
                confirmVariant="primary"
                onCancel={() => setPendingRoleChange(null)}
                onConfirm={handleRoleChange}
                busy={Boolean(busyId)}
            />
        </div>
    );
};