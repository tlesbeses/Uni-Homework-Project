"""Exporta EventLog a CSV o JSON para estudios de data analysis.

Comparte filtros y formato con el endpoint web
``GET /auth/admin/export-events/`` (ver DATOS.md):

    python manage.py export_events --format csv --output eventos.csv
    python manage.py export_events --format json --action login --from 2026-01-01
    python manage.py export_events --user-id 3 --output parcial.csv
"""

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from authentication.services import export_events_csv, export_events_json, filter_event_logs


class Command(BaseCommand):
    help = (
        "Exporta los eventos de EventLog a CSV o JSON con los mismos "
        "filtros que la consola de administración (action, entity_type, "
        "user_id, from, to). Sin --action se excluyen los logins, como en "
        "el listado de actividad."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--format",
            choices=("csv", "json"),
            default=None,
            help="Formato de salida. Default: la extensión de --output o csv.",
        )
        parser.add_argument(
            "--output",
            default=None,
            help="Archivo destino. Sin esta opción se imprime en la terminal.",
        )
        parser.add_argument("--action", default=None, help="Filtrar por acción (p. ej. login, update).")
        parser.add_argument("--entity-type", dest="entity_type", default=None, help="Filtrar por entidad (p. ej. course, grade).")
        parser.add_argument("--user-id", dest="user_id", type=int, default=None, help="Filtrar por actor o target.")
        parser.add_argument("--from", dest="date_from", default=None, help="Fecha inicial ISO (AAAA-MM-DD), inclusive.")
        parser.add_argument("--to", dest="date_to", default=None, help="Fecha final ISO (AAAA-MM-DD), inclusive.")

    def handle(self, *args, **options):
        fmt = options["format"]
        output = options["output"]
        if fmt is None:
            fmt = "json" if output and output.endswith(".json") else "csv"

        date_from = self._parse_date(options["date_from"], "--from")
        date_to = self._parse_date(options["date_to"], "--to")

        events = list(
            filter_event_logs(
                action=options["action"],
                entity_type=options["entity_type"],
                user_id=options["user_id"],
                date_from=date_from,
                date_to=date_to,
            )
        )

        body = export_events_csv(events) if fmt == "csv" else export_events_json(events)
        count = len(events)

        if output:
            # newline="" le deja al módulo csv el manejo de fin de línea.
            with open(output, "w", encoding="utf-8", newline="") as handle:
                handle.write(body)
            self.stdout.write(f"Exportados {count} eventos a {output} ({fmt}).")
        else:
            self.stdout.write(body)
            if body and not body.endswith("\n"):
                self.stdout.write("")
            self.stderr.write(f"{count} eventos exportados ({fmt}).")

    @staticmethod
    def _parse_date(value, flag):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise CommandError(f"{flag} debe ser una fecha ISO válida (AAAA-MM-DD).")
