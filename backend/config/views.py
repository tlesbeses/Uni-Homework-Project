from pathlib import Path

from django.conf import settings
from django.http import FileResponse


def frontend(request):
    index_file = settings.FRONTEND_DIR / "index.html"
    return FileResponse(open(index_file, "rb"))