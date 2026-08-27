from pathlib import Path

from django.conf import settings
from django.http import FileResponse


def frontend(request):
    index_file = settings.FRONTEND_DIR / "index.html"
    return FileResponse(open(index_file, "rb"))


def pwa_manifest(request):
    manifest_file = settings.FRONTEND_DIR / "manifest.json"
    response = FileResponse(
        open(manifest_file, "rb"),
        content_type="application/manifest+json",
    )
    response["Cache-Control"] = "public, max-age=3600"
    return response