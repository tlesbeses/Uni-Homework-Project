from .models import EventLog


def log_event(*, actor=None, action, entity_type="", entity_id=None, target=None, metadata=None):
    """Registra un evento de forma segura, sin romper el flujo principal.

    Si el registro falla (p. ej. un valor fuera de rango), se ignora el error
    para que nunca bloquee una petición de negocio.
    """
    try:
        EventLog.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type or "",
            entity_id=entity_id,
            target=target,
            metadata=metadata,
        )
    except Exception:
        pass
