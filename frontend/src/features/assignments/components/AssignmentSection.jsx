import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssignmentList } from "@/features/assignments/components/AssignmentList";
import { CreateAssignmentModal } from "@/features/assignments/components/CreateAssignmentModal";
import { EditAssignmentModal } from "@/features/assignments/components/EditAssignmentModal";
import { useAssignments } from "@/features/assignments/hooks/useAssignments";
import {
    useDeleteAssignment,
    useToggleAssignmentPublish,
} from "@/features/assignments/hooks/useAssignmentMutations";
import { Pager } from "@/shared/components/Pager";
import { SearchInput } from "@/shared/components/SearchInput";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

const DEFAULT_PAGE_SIZE = 6;

export const AssignmentSection = ({ courseId, isTeacher, isOwner, selectedSectionId }) => {
    const navigate = useNavigate();
    const { assignments, loading, error, reload } = useAssignments(courseId);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [pendingDelete, setPendingDelete] = useState(null);

    const deleteMutation = useDeleteAssignment();
    const togglePublishMutation = useToggleAssignmentPublish();

    const canManage = isTeacher && isOwner;

    const normalizedSearch = search.trim().toLowerCase();
    const filteredAssignments = normalizedSearch
        ? assignments.filter(
              (assignment) =>
                  assignment.title
                      ?.toLowerCase()
                      .includes(normalizedSearch) ||
                  assignment.description
                      ?.toLowerCase()
                      .includes(normalizedSearch)
          )
        : assignments;

    const totalPages = Math.max(
        1,
        Math.ceil(filteredAssignments.length / pageSize)
    );
    const safePage = Math.min(page, totalPages);
    const visibleAssignments = filteredAssignments.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize
    );

    const handleSearchChange = (value) => {
        setSearch(value);
        setPage(1);
    };

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    const handleGrade = (assignment) => {
        const params = new URLSearchParams({ assignment: assignment.id });
        if (selectedSectionId) {
            params.set("section", selectedSectionId);
        }
        navigate(`/grades?${params.toString()}`);
    };

    const confirmDelete = async () => {
        const assignment = pendingDelete;
        setPendingDelete(null);
        setDeletingId(assignment.id);
        try {
            await deleteMutation.mutateAsync(assignment.id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePublish = async (assignment) => {
        setTogglingId(assignment.id);
        try {
            await togglePublishMutation.mutateAsync({
                assignmentId: assignment.id,
                isPublished: !assignment.is_published,
            });
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                    Asignaciones
                </h2>
                {canManage && (
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                    >
                        + Nueva asignación
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Cargando asignaciones...</p>
            ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
            ) : (
                <>
                    {assignments.length > 0 && (
                        <div className="mb-4">
                            <SearchInput
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Buscar asignación por título o descripción..."
                            />
                        </div>
                    )}

                    {filteredAssignments.length === 0 &&
                    normalizedSearch ? (
                        <p className="text-sm text-gray-500">
                            Sin resultados para &laquo;{search.trim()}
                            &raquo;.
                        </p>
                    ) : (
                        <AssignmentList
                            assignments={visibleAssignments}
                            canManage={canManage}
                            onEdit={setEditingAssignment}
                            onDelete={setPendingDelete}
                            onTogglePublish={handleTogglePublish}
                            onGrade={canManage ? handleGrade : undefined}
                            onOpen={handleGrade}
                            deletingId={deletingId}
                            togglingId={togglingId}
                        />
                    )}

                    <Pager
                        page={safePage}
                        totalPages={totalPages}
                        onChange={setPage}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        defaultPageSize={DEFAULT_PAGE_SIZE}
                    />
                </>
            )}

            <CreateAssignmentModal
                courseId={courseId}
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={() => {
                    setIsCreateOpen(false);
                    reload();
                }}
            />

            <EditAssignmentModal
                assignment={editingAssignment}
                open={Boolean(editingAssignment)}
                onClose={() => setEditingAssignment(null)}
                onSaved={() => {
                    setEditingAssignment(null);
                    reload();
                }}
            />

            <ConfirmModal
                open={Boolean(pendingDelete)}
                title="Eliminar asignación"
                description={
                    pendingDelete
                        ? `¿Eliminar "${pendingDelete.title}"? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmLabel="Eliminar"
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                busy={Boolean(deletingId)}
            />
        </div>
    );
};
