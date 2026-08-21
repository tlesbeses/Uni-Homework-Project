import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnrollments } from "@/features/courses/hooks/useEnrollments";
import {
    approveEnrollment,
    createSection,
    deleteSection,
    getSections,
    rejectEnrollment,
    updateSection,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const CourseDetailSidebar = ({ courseId, isOwner, reloadCourse }) => {
    const {
        enrollments,
        loading: loadingEnrollments,
        error: enrollmentsError,
        reload: reloadEnrollments,
        updatingEnrollmentId,
    } = useEnrollments(courseId);

    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(true);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState("");
    const [savingId, setSavingId] = useState(null);

    const loadSections = useCallback(async () => {
        setLoadingSections(true);
        try {
            const data = await getSections(courseId);
            const list = Array.isArray(data.results)
                ? data.results
                : Array.isArray(data)
                  ? data
                  : [];
            setSections(list);
            setSelectedSectionId((current) =>
                current !== null && list.some((s) => s.id === current)
                    ? current
                    : (list[0]?.id ?? null)
            );
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoadingSections(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadSections();
    }, [loadSections]);

    const pendingRequests = enrollments.filter(
        (enrollment) => enrollment.status === "PENDING"
    );

    const selectedSection =
        sections.find((section) => section.id === selectedSectionId) ?? null;

    const sectionMembers = enrollments.filter(
        (enrollment) =>
            enrollment.section?.id === selectedSectionId &&
            enrollment.status === "APPROVED"
    );

    const handleStatus = useCallback(
        async (enrollmentId, action) => {
            setSavingId(`enrollment-${enrollmentId}`);
            try {
                if (action === "approve") {
                    await approveEnrollment(enrollmentId);
                    toast.success("Inscripción aprobada");
                } else {
                    await rejectEnrollment(enrollmentId);
                    toast.success("Inscripción rechazada");
                }
                await reloadEnrollments();
                await reloadCourse();
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingId(null);
            }
        },
        [reloadEnrollments, reloadCourse]
    );

    const selectSection = (sectionId) => {
        setSelectedSectionId(sectionId);
        setIsEditing(false);
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!newName.trim()) {
            return;
        }
        setCreating(true);
        try {
            await createSection(courseId, newName.trim());
            toast.success("Sección creada");
            setNewName("");
            await loadSections();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setCreating(false);
        }
    };

    const startEditing = () => {
        if (!selectedSection) {
            return;
        }
        setEditingName(selectedSection.name);
        setIsEditing(true);
    };

    const handleRename = async () => {
        if (!selectedSection || !editingName.trim()) {
            return;
        }
        setSavingId(selectedSection.id);
        try {
            await updateSection(selectedSection.id, {
                name: editingName.trim(),
            });
            toast.success("Sección actualizada");
            setIsEditing(false);
            await loadSections();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async () => {
        if (!selectedSection) {
            return;
        }
        if (
            !window.confirm(
                "¿Eliminar esta sección? Sus inscripciones y equipos también se eliminarán."
            )
        ) {
            return;
        }
        setSavingId(selectedSection.id);
        try {
            await deleteSection(selectedSection.id);
            toast.success("Sección eliminada");
            setSelectedSectionId(null);
            await Promise.all([loadSections(), reloadCourse()]);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <aside className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Solicitudes de inscripción
                    </h2>
                    {pendingRequests.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 whitespace-nowrap">
                            {pendingRequests.length} pendiente
                            {pendingRequests.length === 1 ? "" : "s"}
                        </span>
                    )}
                </div>

                {loadingEnrollments ? (
                    <p className="text-sm text-gray-500">
                        Cargando solicitudes...
                    </p>
                ) : enrollmentsError ? (
                    <p className="text-sm text-red-500">{enrollmentsError}</p>
                ) : pendingRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No hay solicitudes pendientes.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {pendingRequests.map((enrollment) => {
                            const busy =
                                savingId === `enrollment-${enrollment.id}` ||
                                updatingEnrollmentId === enrollment.id;

                            return (
                                <li key={enrollment.id} className="py-3">
                                    <p className="text-sm font-medium text-gray-800">
                                        {enrollment.student?.username ??
                                            "Desconocido"}
                                    </p>
                                    {enrollment.section?.name && (
                                        <p className="text-xs text-gray-500">
                                            Sección: {enrollment.section.name}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleStatus(
                                                    enrollment.id,
                                                    "approve"
                                                )
                                            }
                                            disabled={busy}
                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                                        >
                                            Aprobar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleStatus(
                                                    enrollment.id,
                                                    "reject"
                                                )
                                            }
                                            disabled={busy}
                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                                        >
                                            Rechazar
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Secciones
                </h2>

                {loadingSections ? (
                    <p className="text-sm text-gray-500">
                        Cargando secciones...
                    </p>
                ) : sections.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Aún no hay secciones. Crea una para que los estudiantes
                        puedan inscribirse.
                    </p>
                ) : (
                    <>
                        <ul className="space-y-1 mb-4">
                            {sections.map((section) => {
                                const active =
                                    section.id === selectedSectionId;

                                return (
                                    <li key={section.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                selectSection(section.id)
                                            }
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                                                active
                                                    ? "bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200"
                                                    : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            <span>{section.name}</span>
                                            <span
                                                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    active
                                                        ? "bg-indigo-100 text-indigo-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {section.enrollments_count ??
                                                    0}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {selectedSection && (
                            <div className="rounded-lg border border-gray-200 p-4">
                                {isEditing ? (
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            handleRename();
                                        }}
                                        className="flex flex-col gap-3"
                                    >
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(event) =>
                                                setEditingName(event.target.value)
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="submit"
                                                disabled={
                                                    savingId ===
                                                        selectedSection.id ||
                                                    !editingName.trim()
                                                }
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsEditing(false)
                                                }
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                                    Inscritos ·{" "}
                                                    {selectedSection.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {sectionMembers.length}{" "}
                                                    estudiante
                                                    {sectionMembers.length === 1
                                                        ? ""
                                                        : "s"}
                                                </p>
                                            </div>
                                            {isOwner && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={startEditing}
                                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleDelete}
                                                        disabled={
                                                            savingId ===
                                                            selectedSection.id
                                                        }
                                                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {loadingEnrollments ? (
                                            <p className="text-sm text-gray-500">
                                                Cargando inscritos...
                                            </p>
                                        ) : sectionMembers.length === 0 ? (
                                            <p className="text-sm text-gray-500">
                                                No hay estudiantes inscritos en
                                                esta sección.
                                            </p>
                                        ) : (
                                            <ul className="divide-y divide-gray-100">
                                                {sectionMembers.map(
                                                    (member) => (
                                                        <li
                                                            key={member.id}
                                                            className="py-2 flex items-center justify-between gap-3"
                                                        >
                                                            <span className="text-sm text-gray-800">
                                                                {member.student
                                                                    ?.username ??
                                                                    "Desconocido"}
                                                            </span>
                                                            {member.approved_at && (
                                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                                    Desde{" "}
                                                                    {new Date(
                                                                        member.approved_at
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}

                {isOwner && (
                    <form
                        onSubmit={handleCreate}
                        className="flex items-end gap-3 mt-4 pt-4 border-t border-gray-100"
                    >
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Nueva sección
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(event) =>
                                    setNewName(event.target.value)
                                }
                                placeholder="Ej. 1TS1"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating || !newName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow transition"
                        >
                            {creating ? "Creando..." : "+ Agregar"}
                        </button>
                    </form>
                )}
            </div>
        </aside>
    );
};
