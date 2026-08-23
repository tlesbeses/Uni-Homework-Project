import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnrollments } from "@/features/courses/hooks/useEnrollments";
import {
  approveEnrollment,
  createSection,
  deleteEnrollment,
  deleteSection,
  getSections,
  rejectEnrollment,
  updateSection,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { Pager } from "@/shared/components/Pager";
import { SearchInput } from "@/shared/components/SearchInput";

const DEFAULT_MEMBER_PAGE_SIZE = 10;

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
  const [requestsView, setRequestsView] = useState("PENDING");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(
    DEFAULT_MEMBER_PAGE_SIZE,
  );

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const data = await getSections(courseId, { page_size: 100 });
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : [];
      setSections(list);
      setSelectedSectionId((current) =>
        current !== null && list.some((s) => s.id === current)
          ? current
          : (list[0]?.id ?? null),
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
    (enrollment) => enrollment.status === "PENDING",
  );

  const rejectedRequests = enrollments.filter(
    (enrollment) => enrollment.status === "REJECTED",
  );

  const visibleRequests =
    requestsView === "PENDING" ? pendingRequests : rejectedRequests;

  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? null;

  const sectionMembers = enrollments.filter(
    (enrollment) =>
      enrollment.section?.id === selectedSectionId &&
      enrollment.status === "APPROVED",
  );

  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const filteredMembers = normalizedMemberSearch
    ? sectionMembers.filter((member) => {
        const student = member.student ?? {};
        return (
          student.username?.toLowerCase().includes(normalizedMemberSearch) ||
          student.first_name?.toLowerCase().includes(normalizedMemberSearch) ||
          student.last_name?.toLowerCase().includes(normalizedMemberSearch)
        );
      })
    : sectionMembers;

  const memberTotalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / memberPageSize),
  );
  const safeMemberPage = Math.min(memberPage, memberTotalPages);
  const visibleMembers = filteredMembers.slice(
    (safeMemberPage - 1) * memberPageSize,
    safeMemberPage * memberPageSize,
  );

  const handleMemberSearchChange = (value) => {
    setMemberSearch(value);
    setMemberPage(1);
  };

  const handleMemberPageSizeChange = (size) => {
    setMemberPageSize(size);
    setMemberPage(1);
  };

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
    [reloadEnrollments, reloadCourse],
  );

  const handleRemove = async (enrollment) => {
    if (
      !window.confirm(
        `¿Eliminar la inscripción de ${
          enrollment.student?.username ?? "este estudiante"
        }?`,
      )
    ) {
      return;
    }
    setSavingId(`enrollment-${enrollment.id}`);
    try {
      await deleteEnrollment(enrollment.id);
      toast.success("Inscripción eliminada");
      await Promise.all([reloadEnrollments(), reloadCourse()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const selectSection = (sectionId) => {
    setSelectedSectionId(sectionId);
    setIsEditing(false);
    setMemberSearch("");
    setMemberPage(1);
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
        "¿Eliminar esta sección? Sus inscripciones y equipos también se eliminarán.",
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Solicitudes de inscripción
        </h2>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-4">
          {[
            {
              key: "PENDING",
              label: `Pendientes (${pendingRequests.length})`,
            },
            {
              key: "REJECTED",
              label: `Rechazadas (${rejectedRequests.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRequestsView(tab.key)}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                requestsView === tab.key
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadingEnrollments ? (
          <p className="text-sm text-gray-500">Cargando solicitudes...</p>
        ) : enrollmentsError ? (
          <p className="text-sm text-red-500">{enrollmentsError}</p>
        ) : visibleRequests.length === 0 ? (
          <p className="text-sm text-gray-500">
            {requestsView === "PENDING"
              ? "No hay solicitudes pendientes."
              : "No hay solicitudes rechazadas."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleRequests.map((enrollment) => {
              const busy =
                savingId === `enrollment-${enrollment.id}` ||
                updatingEnrollmentId === enrollment.id;

              return (
                <li
                  key={enrollment.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {enrollment.student?.username ?? "Desconocido"}
                    </p>
                    {enrollment.section?.name && (
                      <p className="text-xs text-gray-500">
                        Sección: {enrollment.section.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatus(enrollment.id, "approve")}
                      disabled={busy}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    {requestsView === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleStatus(enrollment.id, "reject")}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    )}
                    {requestsView === "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleRemove(enrollment)}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Secciones</h2>

        {loadingSections ? (
          <p className="text-sm text-gray-500">Cargando secciones...</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aún no hay secciones. Crea una para que los estudiantes puedan
            inscribirse.
          </p>
        ) : (
          <>
            <select
              value={selectedSectionId ?? ""}
              onChange={(event) => selectSection(Number(event.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            >
              <option value="" disabled>
                Selecciona una sección...
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} ({section.enrollments_count ?? 0} inscritos)
                </option>
              ))}
            </select>

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
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={
                          savingId === selectedSection.id || !editingName.trim()
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
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
                          Inscritos · {selectedSection.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {filteredMembers.length} estudiante
                          {filteredMembers.length === 1 ? "" : "s"}
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
                            disabled={savingId === selectedSection.id}
                            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    {sectionMembers.length > 0 && (
                      <div className="mb-3">
                        <SearchInput
                          value={memberSearch}
                          onChange={handleMemberSearchChange}
                          placeholder="Buscar estudiante por nombre..."
                        />
                      </div>
                    )}

                    {loadingEnrollments ? (
                      <p className="text-sm text-gray-500">
                        Cargando inscritos...
                      </p>
                    ) : sectionMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No hay estudiantes inscritos en esta sección.
                      </p>
                    ) : filteredMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Ningún estudiante coincide con &laquo;
                        {memberSearch.trim()}
                        &raquo;.
                      </p>
                    ) : (
                      <>
                        <ul className="divide-y divide-gray-100">
                          {visibleMembers.map((member) => (
                            <li
                              key={member.id}
                              className="py-2 flex items-center justify-between gap-3"
                            >
                              <span className="text-sm text-gray-800">
                                {member.student.first_name &&
                                member.student.last_name
                                  ? `${member.student.first_name.split(" ")[0]} ${member.student.last_name.split(" ")[0]}`
                                  : member.student.username || "Desconocido"}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                {member.approved_at && (
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    Desde{" "}
                                    {new Date(
                                      member.approved_at,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(member)}
                                    disabled={
                                      savingId === `enrollment-${member.id}`
                                    }
                                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <Pager
                          page={safeMemberPage}
                          totalPages={memberTotalPages}
                          onChange={setMemberPage}
                          pageSize={memberPageSize}
                          onPageSizeChange={handleMemberPageSizeChange}
                          compact
                        />
                      </>
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
        )}
      </div>
    </aside>
  );
};
