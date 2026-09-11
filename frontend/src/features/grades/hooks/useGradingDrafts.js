import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

// Encapsula el estado de borradores de notas del panel de evaluación del
// profesor: valores en edición, autoguardado al salir del input y vaciado
// pendiente al cambiar de asignación/curso.
export const useGradingDrafts = ({
    selectedAssignmentId,
    maxScore,
    overwriteIndividual,
    teams,
    getTeamGrade,
    studentPersistedScore,
    gradeStudentMutation,
    gradeTeamMutation,
}) => {
    const [drafts, setDrafts] = useState({});
    const [savingKey, setSavingKey] = useState(null);
    const inFlightRef = useRef(new Set());

    const setDraft = useCallback(
        (key, value) =>
            setDrafts((prev) => ({ ...prev, [key]: value })),
        []
    );

    const clearDraft = useCallback(
        (key) =>
            setDrafts((prev) => {
                if (!(key in prev)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[key];
                return next;
            }),
        []
    );

    const clearAll = useCallback(() => setDrafts({}), []);

    const draftValue = useCallback((key) => drafts[key], [drafts]);

    const inputValue = useCallback(
        (key, fallback) => {
            const draft = drafts[key];
            if (draft !== undefined) {
                return draft;
            }
            return fallback === null || fallback === undefined
                ? ""
                : String(fallback);
        },
        [drafts]
    );

    const beginSave = useCallback((key) => {
        if (inFlightRef.current.has(key)) {
            return false;
        }
        inFlightRef.current.add(key);
        return true;
    }, []);

    const endSave = useCallback((key) => {
        inFlightRef.current.delete(key);
    }, []);

    const isValidScore = useCallback(
        (raw) => {
            if (raw === "" || raw === null || raw === undefined) {
                return false;
            }
            const value = Number(raw);
            return Number.isFinite(value) && value >= 0 && value <= maxScore;
        },
        [maxScore]
    );

    const autosaveMemberKey = useCallback(
        async (key) => {
            const raw = drafts[key];
            if (!selectedAssignmentId || raw === "" || raw === undefined) {
                return;
            }
            if (!isValidScore(raw)) {
                return;
            }
            const studentId = key.startsWith("m:")
                ? key.split(":").pop()
                : key.startsWith("u:")
                  ? key.slice(2)
                  : null;
            if (!studentId) {
                return;
            }
            const persisted = studentPersistedScore(studentId);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                return;
            }
            if (!beginSave(key)) {
                return;
            }
            setSavingKey(key);
            try {
                await gradeStudentMutation.mutateAsync({
                    assignmentId: selectedAssignmentId,
                    studentId,
                    score: raw,
                });
                clearDraft(key);
                toast.success("Nota individual guardada");
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingKey(null);
                endSave(key);
            }
        },
        [
            drafts,
            selectedAssignmentId,
            isValidScore,
            studentPersistedScore,
            beginSave,
            endSave,
            clearDraft,
            gradeStudentMutation,
        ]
    );

    const autosaveTeamKey = useCallback(
        async (key) => {
            if (!selectedAssignmentId || !key.startsWith("t:")) {
                return;
            }
            const teamId = key.slice(2);
            const team = teams.find(
                (item) => String(item.id) === String(teamId)
            );
            if (!team) {
                return;
            }
            const raw = drafts[key];
            if (!raw) {
                return;
            }
            if (!isValidScore(raw)) {
                return;
            }
            const persisted = getTeamGrade(team);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                return;
            }
            if (!beginSave(key)) {
                return;
            }
            setSavingKey(key);
            try {
                await gradeTeamMutation.mutateAsync({
                    assignmentId: selectedAssignmentId,
                    teamId: team.id,
                    score: raw,
                    overwriteIndividual,
                });
                clearDraft(key);
                toast.success(`Nota aplicada al ${team.name}`);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingKey(null);
                endSave(key);
            }
        },
        [
            drafts,
            selectedAssignmentId,
            teams,
            overwriteIndividual,
            getTeamGrade,
            isValidScore,
            beginSave,
            endSave,
            clearDraft,
            gradeTeamMutation,
        ]
    );

    const flushPendingDrafts = useCallback(async () => {
        const pending = [];
        for (const [key, raw] of Object.entries(drafts)) {
            if (!isValidScore(raw)) {
                continue;
            }
            if (key.startsWith("t:")) {
                const teamId = key.slice(2);
                const team = teams.find(
                    (item) => String(item.id) === String(teamId)
                );
                if (!team) {
                    continue;
                }
                const persisted = getTeamGrade(team);
                if (persisted !== null && Number(raw) === persisted) {
                    clearDraft(key);
                    continue;
                }
                pending.push(
                    (async () => {
                        if (!beginSave(key)) {
                            return;
                        }
                        try {
                            await gradeTeamMutation.mutateAsync({
                                assignmentId: selectedAssignmentId,
                                teamId: team.id,
                                score: raw,
                                overwriteIndividual,
                            });
                            clearDraft(key);
                        } catch (err) {
                            toast.error(getErrorMessage(err));
                        } finally {
                            endSave(key);
                        }
                    })()
                );
                continue;
            }
            const studentId = key.startsWith("m:")
                ? key.split(":").pop()
                : key.startsWith("u:")
                  ? key.slice(2)
                  : null;
            if (!studentId) {
                continue;
            }
            const persisted = studentPersistedScore(studentId);
            if (persisted !== null && Number(raw) === persisted) {
                clearDraft(key);
                continue;
            }
            pending.push(
                (async () => {
                    if (!beginSave(key)) {
                        return;
                    }
                    try {
                        await gradeStudentMutation.mutateAsync({
                            assignmentId: selectedAssignmentId,
                            studentId,
                            score: raw,
                        });
                        clearDraft(key);
                    } catch (err) {
                        toast.error(getErrorMessage(err));
                    } finally {
                        endSave(key);
                    }
                })()
            );
        }
        if (pending.length > 0) {
            await Promise.all(pending);
        }
    }, [
        drafts,
        teams,
        selectedAssignmentId,
        overwriteIndividual,
        getTeamGrade,
        isValidScore,
        studentPersistedScore,
        beginSave,
        endSave,
        clearDraft,
        gradeStudentMutation,
        gradeTeamMutation,
    ]);

    return {
        drafts,
        savingKey,
        setSavingKey,
        setDraft,
        clearDraft,
        clearAll,
        draftValue,
        inputValue,
        beginSave,
        endSave,
        isValidScore,
        autosaveMemberKey,
        autosaveTeamKey,
        flushPendingDrafts,
    };
};