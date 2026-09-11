"""Activa la medición de cobertura en subprocesos de ``manage.py test --parallel``.

Patrón recomendado por coverage para medir tests en paralelo: cuando
``COVERAGE_PROCESS_START`` apunta a una config, cada worker arranca su propia
instancia de coverage con ``process_startup()`` y vuelca su data al final.
Sin la variable (desarrollo normal) este módulo no hace nada.
"""

import os

_enable = os.environ.get("COVERAGE_PROCESS_START")
if _enable:
    try:
        import coverage

        coverage.process_startup()
    except ImportError:  # pragma: no cover - coverage ausente en dev
        pass