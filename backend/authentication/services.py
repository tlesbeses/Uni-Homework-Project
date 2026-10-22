import csv
import io
import json

from django.db.models import Q

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


def filter_event_logs(
    *,
    action=None,
    entity_type=None,
    user_id=None,
    date_from=None,
    date_to=None,
    include_logins=False,
):
    """Queryset de EventLog con los filtros comunes de la consola admin.

    Compartido por ``AdminActivityView``, ``ExportEventsView`` y el comando
    ``export_events`` para que lo que se ve en pantalla, lo que se exporta y
    lo que se vuelca desde la terminal coincidan. Sin ``action`` explícito
    excluye los eventos de login (como en el listado de actividad); con
    ``include_logins=True`` los incluye (p. ej. la exportación "todo").
    """
    qs = EventLog.objects.select_related("actor", "target")

    if action:
        qs = qs.filter(action=action)
    elif not include_logins:
        qs = qs.exclude(action=EventLog.ACTION_LOGIN)

    if entity_type:
        qs = qs.filter(entity_type=entity_type)

    if user_id is not None:
        qs = qs.filter(Q(actor_id=user_id) | Q(target_id=user_id))

    if date_from is not None:
        qs = qs.filter(created_at__date__gte=date_from)

    if date_to is not None:
        qs = qs.filter(created_at__date__lte=date_to)

    return qs.order_by("-created_at")


# Orden de columnas del CSV de exportación (y claves de cada fila JSON).
EXPORT_FIELDS = [
    "id",
    "created_at",
    "action",
    "entity_type",
    "entity_id",
    "actor_id",
    "actor_username",
    "target_id",
    "target_username",
    "metadata",
]


def event_export_row(event):
    """Fila plana de un EventLog para exportación (CSV/JSON)."""
    return {
        "id": event.id,
        "created_at": event.created_at.isoformat(),
        "action": event.action,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id or "",
        "actor_id": event.actor_id or "",
        "actor_username": event.actor.username if event.actor else "",
        "target_id": event.target_id or "",
        "target_username": event.target.username if event.target else "",
        # JSON anidado en la export; en CSV se serializa como string.
        "metadata": event.metadata,
    }


def _csv_cell(value):
    """Serializa una celda y neutraliza la inyección de fórmulas en Excel.

    Un texto que empieza con ``=``, ``+``, ``-`` o ``@`` (p. ej. un nombre de
    curso tipeado por un profesor) se ejecutaría como fórmula al abrir el CSV
    en Excel/Sheets; se anteponye una comilla simple (recomendación OWASP).
    """
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    elif value is None:
        text = ""
    else:
        text = str(value)
    if text and text[0] in "=+-@":
        return "'" + text
    return text


def export_events_csv(events):
    """CSV (como texto) del queryset de EventLog, listo para descargar."""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_FIELDS)
    writer.writeheader()
    for event in events:
        row = event_export_row(event)
        writer.writerow({field: _csv_cell(row[field]) for field in EXPORT_FIELDS})
    return buffer.getvalue()


def export_events_json(events):
    """JSON (como texto) del queryset de EventLog, listo para descargar."""
    rows = [event_export_row(event) for event in events]
    # default=str cubre cualquier valor no serializable de metadata.
    return json.dumps(rows, ensure_ascii=False, default=str)
