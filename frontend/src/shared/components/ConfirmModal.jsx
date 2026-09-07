import { Modal } from "@/shared/components/ui/Modal";
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
    return (
        <Modal open={open} title={title} onClose={onCancel} size="md">
            <div className="p-6">
                <div className="text-sm text-gray-600">{description}</div>
                <div className="flex justify-end gap-3 pt-5">
                    <Button onClick={onCancel} disabled={busy} variant="ghost">
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={busy}
                        variant={confirmVariant}
                    >
                        {busy ? "Procesando..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
