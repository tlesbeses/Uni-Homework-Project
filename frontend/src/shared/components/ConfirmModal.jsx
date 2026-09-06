import { Button } from "@/shared/components/ui/Button";

export const ConfirmModal = ({
    open,
    title,
    description,
    confirmLabel = "Confirmar",
    confirmVariant = "danger",
    onCancel,
    onConfirm,
    busy = false,
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 animate-pop">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                <div className="text-sm text-gray-600 mt-2">{description}</div>
                <div className="flex justify-end gap-3 pt-5">
                    <Button onClick={onCancel} disabled={busy} variant="ghost">
                        Cancelar
                    </Button>
                    <Button onClick={onConfirm} disabled={busy} variant={confirmVariant}>
                        {busy ? "Procesando..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
