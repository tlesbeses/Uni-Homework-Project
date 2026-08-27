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


def _pwa_file(request, filename, content_type, cache_control="no-cache"):
    file_path = settings.FRONTEND_DIR / filename
    response = FileResponse(open(file_path, "rb"), content_type=content_type)
    response["Cache-Control"] = cache_control
    return response


def pwa_service_worker(request):
    return _pwa_file(
        request,
        "sw.js",
        "text/javascript",
        "no-store, max-age=0",
    )


def pwa_register_sw(request):
    return _pwa_file(
        request,
        "registerSW.js",
        "text/javascript",
        "no-store, max-age=0",
    )