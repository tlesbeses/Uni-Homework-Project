# EduNotas — Checklist maestra y roadmap

Checklist maestra con lo implementado, lo pendiente y lo descartado (con motivo). Al terminar algo, se marca en esta lista.

## Roadmap / Checklist de EduNotas

| Prioridad   | Área            | Funcionalidad / tarea                                   | Estado          |
| ----------- | --------------- | ------------------------------------------------------- | --------------- |
| 🔴 Alta     | Seguridad       | Rate limiting en login                                  | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Rate limiting por endpoint sensible (admin/grade)       | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Verificar permisos de profesor sobre sus propios cursos | ✅ Verificado   |
| 🔴 Alta     | Seguridad       | Verificar permisos de estudiante sobre sus cursos       | ✅ Verificado   |
| 🔴 Alta     | Seguridad       | Protección contra IDOR / acceso a recursos ajenos       | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Refresh token rotation                                  | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Refresh token blacklist                                 | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Evitar información sensible en `localStorage`           | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CSRF                                                    | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CORS                                                    | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CSP                                                     | ✅ Implementado |
| 🔴 Alta     | Seguridad       | HSTS                                                    | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Log de cambios sensibles                                | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Registrar cambios de calificaciones                     | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Registrar cambios de cursos                             | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Registrar cambios de usuarios/roles                     | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Auditar alta de inscripción y cambios de tarea (weight/published/max_score) | ✅ Implementado |
| 🔴 Alta     | Historial       | Snapshot automático al borrar sección/curso (inmutable) | ⬜ Pendiente    |
| 🔴 Alta     | Observabilidad  | Error tracking in-house (ErrorLog + EXCEPTION_HANDLER + ErrorBoundary) | ⬜ Pendiente |
| 🔴 Alta     | DevOps          | GitHub Actions: lint + tests backend + test/build frontend (sin deploy) | ⬜ Pendiente |
| 🔴 Alta     | Calificaciones  | Gradebook                                               | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Cálculo de nota final                                   | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Ponderaciones por tarea/examen                          | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Historial de calificaciones                             | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de autenticación                                  | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de permisos                                       | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de API                                            | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de frontend (Vitest + RTL)                        | ✅ Implementado |
| 🟠 Media    | Testing         | Tests frontend críticos (ProtectedRoute, grading, enrollment, exports) | 🚧 Parcial |
| 🟠 Media    | Cursos          | Estados del curso                                       | 🚧 Revisar      |
| 🟠 Media    | Cursos          | Archivar cursos                                         | ✅ Implementado |
| 🟠 Media    | Cursos          | Polling de cursos (refetchInterval 30s)                 | ✅ Implementado |
| 🟠 Media    | Inscripciones   | Estados de inscripción                                  | ✅ Implementado |
| 🟠 Media    | Usuarios        | Desactivación de usuarios (`is_active`)                 | ✅ Implementado |
| 🟠 Media    | Notificaciones  | Notificaciones in-app — solo eventos de sistema (nueva tarea, calificación publicada, admisión, sección cerrada) | ⬜ Pendiente |
| 🟠 Media    | Reportes        | Reporte de curso                                        | ✅ Implementado |
| 🟠 Media    | Reportes        | Exportar CSV/Excel                                      | ✅ Implementado |
| 🟠 Media    | Dashboard       | Dashboard de profesor                                   | ✅ Implementado |
| 🟠 Media    | Dashboard       | Dashboard de estudiante                                 | ✅ Implementado |
| 🟠 Media    | UX/UI           | Estados loading/empty/error                             | ✅ Implementado |
| 🟠 Media    | UX/UI           | Responsive mobile                                       | ✅ Implementado |
| 🟠 Media    | UX/UI           | Design system                                           | 🔍 Revisar      |

### Y agregaría una categoría especial: arquitectura

| Área         | Tarea                                          | Estado           |
| ------------ | ---------------------------------------------- | ---------------- |
| Arquitectura | Revisar estructura de apps Django              | 🔍 Revisar       |
| Arquitectura | Separar lógica de negocio de views             | 🔍 Revisar       |
| Arquitectura | Servicios/repositories donde realmente aporten | 🔍 Revisar       |
| Arquitectura | Manejo global de errores API                   | 🔍 Revisar       |
| Arquitectura | Paginación consistente                         | ✅ Implementado  |
| Arquitectura | Cancelación de requests                        | ✅ Implementado  |
| Arquitectura | TanStack Query                                 | ✅ Implementado  |
| Arquitectura | Cache/invalidation strategy                    | ✅ Implementado  |
| Arquitectura | Axios centralizado                             | ✅ Implementado  |
| Arquitectura | Manejo de 401 + refresh                        | ✅ Implementado  |

### Descartados por decisión de producto (no priorizar)

| Funcionalidad                | Motivo                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| Importar estudiantes por CSV | Los estudiantes crean su cuenta y se inscriben/admiten por el flujo actual |
| Exportar a PDF               | Los reportes van a XLSX/CSV porque después se trabajan en Word           |
| Soft delete genérico         | `is_active` + endpoint admin ya cubren la desactivación                  |
| Email notifications          | Sin necesidad actual; toasts in-app sí.                                |
| Push notifications           | Sin necesidad actual                                                   |
| WebSockets / tiempo real     | El polling (30s) cubre la necesidad de frescura                         |
| Redis compartido             | Escala actual no lo requiere (`REDIS_URL` ya es opcional en `.env.example`) |
| Background jobs              | Nada pesado que lo requiera                                             |
| Analytics avanzadas          | Sin métricas de uso decididas                                           |
| Auditoría de login/teams/sections | Solo se audita lo que afecta calificaciones y admisiones (decisión) |
| `EventLog` en Django admin   | La página frontend de actividad ya permite inspeccionar los logs        |

## Roadmap recomendado (orden de ejecución)

| # | Fase | Alcance | Esfuerzo | Por qué este orden |
|---|---|---|---|---|
| 1 | **CI gate** | `.github/workflows/ci.yml`: job backend (`manage.py check` + `manage.py test`) + job frontend (`oxlint`, `vitest run`, `vite build`); `concurrency` con cancel; **sin deploy** (Render lo hace al mergear `main`) | ~1d | Protege todo lo siguiente: `main` auto-despliega en Render |
| 2 | **Auditoría completa** | ✅ Hecho: logs de alta de inscripción (join/enroll, con status) y cambio de tarea (weight/published/max_score); labels en `activityMeta.js`. Fuera de alcance (decisión): login, teams, sections, Django admin | — | — |
| 3 | **Snapshots por borrado** | Señal `pre_delete` en `Section` → `capture_section_snapshot()`; borrar curso genera snapshot por sección (cascada); modelo `SectionSnapshot` inmutable con payload JSON desnormalizado (curso, profesor, sección, inscripciones, equipos, tareas, notas, nota final, agregados); endpoints de lectura + export XLSX/CSV/JSON desde snapshot (reusar `grading/exports.py`); vista histórica frontend; tests | 2–4d | Es el valor principal del backlog |
| 4 | **Observabilidad in-house** | Custom `EXCEPTION_HANDLER` (`config/errors.py`) → `ErrorLog` (path, user, clase, traceback, status, `error_id`) + JSON estable; `POST /api/errors/` (AllowAny + throttle + sanitizado) y GET superusuario + página admin; `ErrorBoundary` + listeners `error`/`unhandledrejection` en frontend; sin Sentry | 1–2d | Con más features y merges, detectar errores de prod es crítico |
| 5 | **Notificaciones in-app** | Modelo `Notification` (recipient, type, payload, `is_read`, índices) + API (listar, marcar leída, todas, count) + triggers dentro de los servicios (grade_team/grade_student, publicación de tarea, admisión) + campana con polling 30s + limpieza de leídas antiguas + tests. Solo eventos de sistema | 1.5–3d | Valor real pero secundario |
| 6 | **Tests frontend críticos** | Lote 1: `ProtectedRoute` (roles/superuser/block), `useGradeMutations` + validación 0..max, flujo approve/reject/auto-aceptar matrícula, export en `GradesReportPage` (blob). Entremezclado con las fases 3–5 | 1–2d | Protege lo crítico, sin perseguir coverage |

## Notas de la auditoría (revisado contra el código)

- **CSP** en **modo bloqueo** (`Content-Security-Policy`, `config/middleware.py` + `settings.py`, activable por defecto; `CSP_APPLY=False` para desactivar, `CSP_REPORT_URI` para monitorizar además). Se omite en DEBUG. Los hashes `script-src` se calculan dinámicamente sobre los scripts inline del `index.html` servido (immune a cambios de build y saltos de línea).
- **Auditoría:** `EventLog` cubre impersonación, calificaciones, cursos (crear/editar/borrar + `course_settings` + inscripciones approve/reject/eliminar), usuarios/roles (activar/desactivar, cambiar rol), **alta de inscripción** (join/enroll/Create, con status final incluida la auto-aceptación) y **tareas** (update de `weight`/`max_score`/`is_published` con cambios desde/hacia; los edits cosméticos de título no generan evento). Quedan fuera por decisión: login, sections y teams. `EventLog` no está registrado en el admin de Django (se inspecciona desde la página de actividad del frontend).
- **Historial de calificaciones:** `GradeHistory` guarda cada cambio (old/new + actor + fecha) y se consulta vía `GET /api/grades/<pk>/history/`; modal en el panel del profesor.
- **Nota final:** cálculo ponderado server-side (`grading/final.py`, sin calificar cuenta como 0) expuesto en el dashboard; cada tarea tiene `weight`.
- **Exportar:** Excel `.xlsx` (openpyxl, con sanitización anti-inyección de fórmulas) y CSV (UTF-8 con BOM, misma sanitización, columna total). No hay PDF (descartado).
- **Estados del curso:** visibilidad (Público/Privado), `is_active` y respaldo de archivar/restaurar (oculta el curso por completo al estudiante; el teacher lo ve para restaurar). Las secciones no tienen `is_closed`: el cierre/histórico llegará con los **snapshots por borrado**.
- **Desactivación de usuarios:** existe `is_active` con endpoint admin; no hay soft-delete con `deleted_at` (descartado).
- **Throttles por endpoint:** `AdminThrottle` (admin 20/min) en impersonate/admin/users/activity y `GradeThrottle` (grade 60/min) en grade-team/grade-student. `is_active` en el admin ahora exige booleano real (antes `bool("false")` se convertía a `True`).
- **Renovación de sesión:** el interceptor reintenta el refresh tras re-sincronizar el token CSRF si la cookie expiró (403) con la sesión aún viva (p. ej. impersonación inactiva >1 h).
- **Snapshots (decisión de diseño):** se crean **automáticamente al borrar** — señal `pre_delete` de `Section` cubre borrar una sección y, vía cascada, borrar un curso (snapshot por cada sección). Payload JSON desnormalizado e inmutable; reportes históricos se regeneran desde el snapshot reutilizando `grading/exports.py`. Si la captura falla, no bloquea el borrado y queda en `ErrorLog`.
- **Notificaciones (decisión):** solo eventos de sistema (nueva tarea, calificación publicada, admisión aprobada); sin WebSockets ni email/push; polling 30s con TanStack Query; limpieza de leídas antiguas.
- **Observabilidad (decisión):** in-house, sin Sentry — `ErrorLog` + custom `EXCEPTION_HANDLER` + `POST /api/errors/` + `ErrorBoundary` frontend.
- **CI/CD (decisión):** pipeline de verificación en GitHub Actions (lint, tests backend, test/build frontend) que corre en PRs y push; **sin deploy automático** (Render despliega al mergear `main`).
- **Tests backend:** 202 tests en 5 apps (auth, course, grading, teams, assignments). **Tests frontend:** Vitest + React Testing Library (10 tests sobre autenticación/interceptor CSRF y AuthProvider; cobertura inicial con `npm run coverage`). El reporte `frontend/coverage/` está en `.gitignore` (no se sube).
- **TanStack Query / cache / polling:** implementados (polling de cursos a 30s, solo pestaña enfocada).

**Esta lista es el backlog técnico.** Cuando termines algo, decime _"ya terminé X"_ y vamos actualizando y tachando.