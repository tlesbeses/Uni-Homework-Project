import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    createSection,
    deleteSection,
    getSections,
    updateSection,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const SectionSection = ({ courseId }) => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [savingId, setSavingId] = useState(null);

    const loadSections = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSections(courseId);
            setSections(
                Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data)
                      ? data
                      : []
            );
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadSections();
    }, [loadSections]);

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

    const handleRename = async (sectionId) => {
        if (!editingName.trim()) {
            return;
        }
        setSavingId(sectionId);
        try {
            await updateSection(sectionId, { name: editingName.trim() });
            toast.success("Sección actualizada");
            setEditingId(null);
            await loadSections();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (sectionId) => {
        if (
            !window.confirm(
                "¿Eliminar esta sección? Sus inscripciones y equipos también se eliminarán."
            )
        ) {
            return;
        }
        setSavingId(sectionId);
        try {
            await deleteSection(sectionId);
            toast.success("Sección eliminada");
            await loadSections();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Secciones
            </h2>

            {loading ? (
                <p className="text-sm text-gray-500">Cargando secciones...</p>
            ) : sections.length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">
                    Aún no hay secciones. Crea una para que los estudiantes
                    puedan inscribirse.
                </p>
            ) : (
                <ul className="divide-y divide-gray-100 mb-4">
                    {sections.map((section) => (
                        <li
                            key={section.id}
                            className="py-3 flex items-center justify-between gap-3"
                        >
                            {editingId === section.id ? (
                                <div className="flex flex-1 items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(event) =>
                                            setEditingName(event.target.value)
                                        }
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRename(section.id)}
                                        disabled={savingId === section.id}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            {section.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {section.enrollments_count ?? 0}{" "}
                                            inscritos
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingId(section.id);
                                                setEditingName(section.name);
                                            }}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(section.id)
                                            }
                                            disabled={savingId === section.id}
                                            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <form
                onSubmit={handleCreate}
                className="flex items-end gap-3 pt-2 border-t border-gray-100"
            >
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        Nueva sección
                    </label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
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
        </div>
    );
};
