import { Button } from "@/shared/components/ui/Button";
import { teamDraftKey } from "@/features/grades/components/grading/gradingUtils";

export const TeamNoteForm = ({
    team,
    hasIndividual,
    overwriteIndividual,
    setOverwriteIndividual,
    maxScore,
    inputValue,
    setDraft,
    savingKey,
    getTeamGrade,
    onSubmit,
    onAutosave,
}) => {
    const key = teamDraftKey(team.id);
    const value = inputValue(key, getTeamGrade(team));
    const saving = savingKey === key;

    return (
        <>
            {hasIndividual && (
                <label className="mt-4 flex items-center gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={overwriteIndividual}
                        onChange={(e) => setOverwriteIndividual(e.target.checked)}
                        className="accent-indigo-600 w-4 h-4"
                    />
                    Sobrescribir también las notas individuales al aplicar la
                    nota del equipo
                </label>
            )}

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit(team);
                }}
                className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3"
            >
                <span className="text-sm font-semibold text-gray-700">
                    Nota del equipo
                </span>
                <span className="flex items-center gap-2">
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxScore}
                        value={value}
                        onChange={(e) => setDraft(key, e.target.value)}
                        onBlur={() => onAutosave(key)}
                        onFocus={(e) => e.target.select()}
                        className="w-20 px-2 py-1.5 rounded-lg border outline-none transition text-right text-sm font-semibold text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="__"
                    />
                    <span className="text-xs text-gray-400">/ {maxScore}</span>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={saving || !value}
                    >
                        {saving ? "Guardando..." : "Aplicar a todos"}
                    </Button>
                </span>
            </form>

            <p className="mt-3 text-xs text-gray-400">
                La nota del equipo se aplica a todos los integrantes; las notas
                individuales la reemplazan solo para ese estudiante y se
                conservan al reevaluar el equipo.
            </p>
        </>
    );
};