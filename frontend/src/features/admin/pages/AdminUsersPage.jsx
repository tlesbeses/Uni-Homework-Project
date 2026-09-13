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
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";
import { Pager } from "@/shared/components/Pager";

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

    const { users, count, totalPages, loading, error, reload, page, setPage, pageSize, handlePageSizeChange } =
        useAdminUsers({ search, role });

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
                        onChange={(value) => {
                            setSearch(value);
                            setPage(1);
                        }}
                        placeholder="Buscar por nombre, usuario o email..."
                    />
                </div>
                <SelectField
                    compact
                    className="sm:w-48"
                    value={role}
                    onChange={(event) => {
                        setRole(event.target.value);
                        setPage(1);
                    }}
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

            <ResponsiveDataTable
                ariaLabel="Usuarios registrados"
                columns={[
                    {
                        key: "user",
                        header: "Usuario",
                        role: "primary",
                        render: (u) => (
                            <>
                                <p className="font-medium text-gray-800">
                                    {formatUser(u)}
                                    {u.id === currentUser?.id && (
                                        <span className="ml-2 text-xs text-gray-400">
                                            (tú)
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-400">
                                    @{u.username}
                                </p>
                            </>
                        ),
                    },
                    {
                        key: "email",
                        header: "Email",
                        role: "secondary",
                        className: "text-gray-600",
                        render: (u) => u.email || "—",
                    },
                    {
                        key: "role",
                        header: "Rol",
                        role: "secondary",
                        render: (u) => {
                            const roleKey = u.is_superuser
                                ? "Superuser"
                                : u.roles.includes("Teacher")
                                  ? "Teacher"
                                  : "Student";
                            return (
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[roleKey]}`}
                                >
                                    {u.is_superuser
                                        ? "Superusuario"
                                        : u.roles.includes("Teacher")
                                          ? "Profesor"
                                          : "Estudiante"}
                                </span>
                            );
                        },
                    },
                    {
                        key: "state",
                        header: "Estado",
                        role: "primary",
                        render: (u) => (
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
                                {u.is_active ? "Activo" : "Inactivo"}
                            </span>
                        ),
                    },
                    {
                        key: "date_joined",
                        header: "Alta",
                        role: "secondary",
                        className: "text-gray-600",
                        render: (u) => formatDate(u.date_joined),
                    },
                ]}
                rows={sortedUsers}
                rowKey={(u) => u.id}
                rowClassName={(u) => (u.is_active ? "" : "bg-gray-50")}
                noActionsLabel="Sin acciones"
                actionsLabel="Ver acciones"
                actions={(u) => {
                    if (u.is_superuser) {
                        return [];
                    }
                    return [
                        {
                            key: "toggle-active",
                            label: u.is_active ? "Desactivar" : "Activar",
                            onClick: handleToggleActive,
                            disabled: (row) => busyId === row.id,
                            variant: u.is_active ? "dangerSoft" : "successSoft",
                            size: "sm",
                        },
                        {
                            key: "change-role",
                            label: u.roles.includes("Teacher")
                                ? "Hacer estudiante"
                                : "Hacer profesor",
                            onClick: setPendingRoleChange,
                            disabled: (row) => busyId === row.id,
                            variant: "outline",
                            size: "sm",
                        },
                        {
                            key: "impersonate",
                            label:
                                impersonatingId === u.id
                                    ? "Probando..."
                                    : "Probar como",
                            onClick: handleImpersonate,
                            disabled: (row) =>
                                busyId === row.id ||
                                impersonatingId === row.id,
                            variant: "secondary",
                            size: "sm",
                        },
                    ];
                }}
                loading={loading && users.length === 0}
                loadingContent="Cargando usuarios..."
                emptyContent="No se encontraron usuarios."
            />

            {!loading && count > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        {count} usuario{count !== 1 ? "s" : ""}
                    </p>
                    <Pager
                        page={page}
                        totalPages={totalPages}
                        onChange={setPage}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        defaultPageSize={9}
                    />
                </div>
            )}

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