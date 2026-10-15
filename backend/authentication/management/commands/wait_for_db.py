import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Blocks until the default database accepts connections."

    def handle(self, *args, **options):
        self.stdout.write("Waiting for database...")
        for _ in range(60):
            try:
                connections["default"].ensure_connection()
            except OperationalError:
                time.sleep(1)
            else:
                self.stdout.write(self.style.SUCCESS("Database available."))
                return
        raise SystemExit("Database unavailable after 60s.")
