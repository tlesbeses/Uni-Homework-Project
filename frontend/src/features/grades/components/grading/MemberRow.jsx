import { Button } from "@/shared/components/ui/Button";
import {
    studentInitials,
    studentName,
} from "@/features/grades/components/grading/gradingUtils";

export const MemberRow = ({
    teamId,
    draftKey,
    student,
    grade,
    individual,
    fallback,
    maxScore,
    inputValue,
    setDraft,
    savingKey,
    onSave,
    onAutosave,
    onOpenHistory,
}) => {
    const value = inputValue(draftKey, fallback);
    const saving = savingKey === draftKey;

    return (
        <li
            key={draftKey}
            className="py-2.5 flex items-center justify-between gap-3"
        >
            <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-semibold shrink-0">
                    {studentInitials(student)}
                </span>
                <span className="text-sm text-gray-800 truncate">
                    {studentName(student)}
                </span>
                {individual && (
                    <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold shrink-0">
                        individual
                    </span>
                )}
                {grade && (
                    <button
                        type="button"
                        onClick={() => onOpenHistory(student, grade)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                        title="Ver historial de notas"
                    >
                        Historial
                    </button>
                )}
            </span>
            <span className="flex items-center gap-2 shrink-0">
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxScore}
                    value={value}
                    onChange={(e) => setDraft(draftKey, e.target.value)}
                    onBlur={() => onAutosave(draftKey)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 px-2 py-1.5 rounded-lg border outline-none transition text-right text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="__"
                />
                <span className="text-xs text-gray-400">/ {maxScore}</span>
                <Button
                    size="sm"
                    onClick={() => onSave(teamId, student.id)}
                    disabled={saving || !value}
                    title="Guardar nota individual"
                >
                    {saving ? "…" : "✓"}
                </Button>
            </span>
        </li>
    );
};