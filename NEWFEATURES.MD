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
| 🔴 Alta     | Historial       | Snapshot automático al borrar sección/curso (inmutable) | ✅ Implementado |
| 🔴 Alta     | Observabilidad  | Error tracking in-house (ErrorLog + EXCEPTION_HANDLER + ErrorBoundary) | ✅ Implementado |
| 🔴 Alta     | DevOps          | GitHub Actions: lint + tests backend + test/build frontend (sin deploy) | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Gradebook                                               | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Cálculo de nota final                                   | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Ponderaciones por tarea/examen                          | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Historial de calificaciones                             | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de autenticación                                  | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de permisos                                       | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de API                                            | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de frontend (Vitest + RTL)                        | ✅ Implementado |
| 🟠 Media    | Testing         | Tests frontend críticos (ProtectedRoute, grading, enrollment, exports) | ✅ Implementado (lote 1) |
| 🟠 Media    | Cursos          | Estados del curso                                       | ✅ Revisado      |
| 🟠 Media    | Cursos          | Archivar cursos                                         | ✅ Implementado |
| 🟠 Media    | Cursos          | Polling de cursos (refetchInterval 30s)                 | ✅ Implementado |
| 🟠 Media    | Inscripciones   | Estados de inscripción                                  | ✅ Implementado |
| 🟠 Media    | Usuarios        | Desactivación de usuarios (`is_active`)                 | ✅ Implementado |
| 🟠 Media    | Notificaciones  | Notificaciones in-app — solo eventos de sistema (calificación publicada, admisión aprobada, solicitud de ingreso) | ✅ Implementado |
| 🟠 Media    | Reportes        | Reporte de curso                                        | ✅ Implementado |
| 🟠 Media    | Reportes        | Exportar CSV/Excel                                      | ✅ Implementado |
| 🟠 Media    | Dashboard       | Dashboard de profesor                                   | ✅ Implementado |
| 🟠 Media    | Dashboard       | Dashboard de estudiante                                 | ✅ Implementado |
| 🟠 Media    | UX/UI           | Estados loading/empty/error                             | ✅ Implementado |
| 🟠 Media    | UX/UI           | Responsive mobile                                       | ✅ Implementado |
| 🟠 Media    | UX/UI           | Design system                                           | ✅ Implementado |

### Y agregaría una categoría especial: arquitectura

| Área         | Tarea                                          | Estado           |
| ------------ | ---------------------------------------------- | ---------------- |
| Arquitectura | Revisar estructura de apps Django              | ✅ Revisado      |
| Arquitectura | Separar lógica de negocio de views             | ✅ Hecho (enrollment) |
| Arquitectura | Servicios/repositories donde realmente aporten | ✅ Revisado      |
| Arquitectura | Manejo global de errores API                   | ✅ Revisado      |
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
| 3 | **Snapshots por borrado** | ✅ Hecho: señal `pre_delete` en `Section` (con `origin` distingue borrado de curso vs de grupo) → `course/snapshots.capture_section_snapshot()`; modelo `SectionSnapshot` inmutable (headers + payload JSON desnormalizado con curso, profesor, estudiantes/estados, equipos, tareas, notas, nota final y agregados); endpoints `GET /api/snapshots/` (búsqueda + paginación, teacher = propios, superuser = todos) + `export-grades` xlsx / `export-grades-csv` / `grades-report` regenerados desde el payload; vista `Histórico` en el frontend (lista + detalle con descargas) | — | — |
| 4 | **Observabilidad in-house** | ✅ Hecho: `config/errors.py` con `EXCEPTION_HANDLER` (solo loguea 5xx inesperados; 400/401/403/404/405/429 pasan igual que antes) → `ErrorLog` (`error_id` público, source server/client, path, user, clase, message, traceback, status, `error_id_ref`); respuesta JSON estable con `error_id` de soporte; `POST /api/errors/` (AllowAny, `ErrorThrottle` 10/min, sanitizado: sin body, con truncados) + `GET /api/errors/` y detalle (superuser, lista sin traceback); `ErrorBoundary` + listeners `error`/`unhandledrejection` (dedupe y anti-spam); página `Errores` en admin (lista con filtro de fuente + detalle con traceback); sin Sentry | 1–2d | Con más features y merges, detectar errores de prod es crítico |
| 5 | **Notificaciones in-app** | ✅ Hecho: app `notifications` con modelo `Notification` (recipient, `type`, payload, `is_read`, índices) + API (listar paginado propio, `unread-count`, marcar leída, `read-all`; todo scoped al usuario, `unread_only`, cleanup perezoso de leídas >30 días) + triggers en los servicios (grade_student/grade_team solo si la tarea está publicada, admisión aprobada manual y por auto-aceptación, solicitud de ingreso pendiente al profesor) + campana con badge + dropdown (polling 30s) + página `/notifications` con filtro y paginación + `notificationMeta` con tests. **Alcance (decisión):** NO hay "tarea publicada" ni aviso por borrado de sección/curso | 1.5–3d | Valor real pero secundario |
| 6 | **Tests frontend críticos** | Lote 1: `ProtectedRoute` (roles/superuser/block), `useGradeMutations` + validación 0..max, flujo approve/reject/auto-aceptar matrícula, export en `GradesReportPage` (blob). Entremezclado con las fases 3–5 | 1–2d | Protege lo crítico, sin perseguir coverage |

## Notas de la auditoría (revisado contra el código)

- **CSP** en **modo bloqueo** (`Content-Security-Policy`, `config/middleware.py` + `settings.py`, activable por defecto; `CSP_APPLY=False` para desactivar, `CSP_REPORT_URI` para monitorizar además). Se omite en DEBUG. Los hashes `script-src` se calculan dinámicamente sobre los scripts inline del `index.html` servido (immune a cambios de build y saltos de línea).
- **Auditoría:** `EventLog` cubre impersonación, calificaciones, cursos (crear/editar/borrar + `course_settings` + inscripciones approve/reject/eliminar), usuarios/roles (activar/desactivar, cambiar rol), **alta de inscripción** (join/enroll/Create, con status final incluida la auto-aceptación) y **tareas** (update de `weight`/`max_score`/`is_published` con cambios desde/hacia; los edits cosméticos de título no generan evento). Quedan fuera por decisión: login, sections y teams. `EventLog` no está registrado en el admin de Django (se inspecciona desde la página de actividad del frontend).
- **Historial de calificaciones:** `GradeHistory` guarda cada cambio (old/new + actor + fecha) y se consulta vía `GET /api/grades/<pk>/history/`; modal en el panel del profesor.
- **Nota final:** cálculo ponderado server-side (`grading/final.py`, sin calificar cuenta como 0) expuesto en el dashboard; cada tarea tiene `weight`.
- **Exportar:** Excel `.xlsx` (openpyxl, con sanitización anti-inyección de fórmulas) y CSV (UTF-8 con BOM, misma sanitización, columna total). No hay PDF (descartado).
- **Estados del curso:** visibilidad (Público/Privado), `is_active` y respaldo de archivar/restaurar (oculta el curso por completo al estudiante; el teacher lo ve para restaurar). Las secciones no tienen `is_closed`: el cierre/histórico llegará con los **snapshots por borrado**.
- **Desactivación de usuarios:** existe `is_active` con endpoint admin; no hay soft-delete con `deleted_at` (descartado).
- **Throttles por endpoint:** `AdminThrottle` (admin 20/min) en impersonate/admin/users/activity, `GradeThrottle` (grade 60/min) en grade-team/grade-student y `ErrorThrottle` (error 10/min, clave por usuario o IP) en el reporte de errores del frontend. `is_active` en el admin ahora exige booleano real (antes `bool("false")` se convertía a `True`).
- **Renovación de sesión:** el interceptor reintenta el refresh tras re-sincronizar el token CSRF si la cookie expiró (403) con la sesión aún viva (p. ej. impersonación inactiva >1 h).
- **Snapshots (decisión de diseño):** se crean **automáticamente al borrar** — señal `pre_delete` de `Section` cubre borrar una sección y, vía cascada, borrar un curso (snapshot por cada sección). El `origin` de Django en la señal distingue `reason` (course_delete vs section_delete). Payload JSON desnormalizado e inmutable; reportes históricos se regeneran desde el snapshot reutilizando `grading/exports.py`. Acceso: el profesor del curso (por `teacher_id` congelado) y superusuarios; los exports congelan la vista oficial (solo tareas publicadas y alumnos aprobados). Si la captura falla, se guarda igual un snapshot degradado y **no** se bloquea el borrado.
- **Notificaciones (decisión):** solo eventos de sistema confirmados por producto: **calificación publicada** (al estudiante, equipo e individual, solo si la tarea está publicada), **admisión aprobada** (al estudiante, manual y auto-aceptación) y **solicitud de ingreso** (al profesor, solo cuando la matrícula queda en PENDING). Fuera de alcance: notificación de tarea publicada, rechazos, borrado de sección/curso y avisos al profesor en auto-aceptación. Sin WebSockets ni email/push; polling 30s con TanStack Query; limpieza perezosa de leídas antiguas (>30 días) al listar.
- **Notificaciones (implementación):** el payload de cada `Notification` es JSON desnormalizado (ids/títulos/curso/sección) y el frontend lo rinde con `notificationMeta` (label, badge de color y ruta de navegación por `type`). Los triggers viven dentro de los servicios (`grading/services.py` y `course/views.py`), respetando el status final y `is_published`; no hay background jobs (decisión). La API está scoped a `request.user.notifications` (404 en ajenas), con `unread-count` para el badge y `read-all` con conteo actualizado; el cleanup borra leídas con más de 30 días al listar. Tests: 21 (triggers por flujo, alcance por usuario, filtros y sweep).
- **Observabilidad (decisión):** in-house, sin Sentry — `ErrorLog` + custom `EXCEPTION_HANDLER` + `POST /api/errors/` + `ErrorBoundary` frontend.
- **Observabilidad (implementación):** el `EXCEPTION_HANDLER` de DRF envuelve el default y solo persiste excepciones no esperadas (5xx); los errores esperados (400/401/403/404/405/429) conservan la respuesta estándar. Todo 500 responde JSON estable con `error_id` público de soporte y guarda traceback solo en la BD. El reporte del frontend es `POST /api/errors/` con throttle propio, validación (al menos kind/message/stack), truncados y sin aceptar el body del request; `GET /api/errors/` (lista sin traceback) y `GET /api/errors/<id>/` (detalle con traceback/metadata) son superuser-only. En el frontend, `ErrorBoundary` + listeners `error`/`unhandledrejection` (con dedupe por firma, máx. 5 cada 10 s, se ignora AbortError/CanceledError y offline) reportan sin romper la app; la consola admin muestra la lista con filtro por fuente y el detalle con traceback.
- **CI/CD (decisión):** pipeline de verificación en GitHub Actions (lint, tests backend, test/build frontend) que corre en PRs y push; **sin deploy automático** (Render despliega al mergear `main`).
- **CI (fix):** el bloque de seguridad de producción (`if not DEBUG:` con `SECURE_SSL_REDIRECT`/HSTS/cookies Secure) se saltaba en los tests CI porque `DEBUG` no está definido, y el `SecurityMiddleware` redirigía a HTTPS cada request del test client con 301 (210 failures + 19 errors). Se corrigió abriendo el bloque solo con `if not DEBUG and "test" not in sys.argv` (mismo idiom ya usado para el throttle): producción y local quedan inalterados.
- **Refactor backend (fase 6, parte B):** capa de servicios de enrollment en `course/services.py` (`create_enrollment`, `approve_enrollment`, `reject_enrollment`, `delete_enrollment` con notify + audit + limpieza de equipos; los errores de estado lanzan `EnrollmentInvalidStateError` y las views lo mapean al mismo `Response` 400 de antes, la API no cambia), helper `is_teacher(user)` cacheado en `course/permissions.py` (sustituye los `user.groups.filter(name="Teacher")` de course/teams/assignments/grading/authentication; la caché de grupos se invalida con la señal m2m de `authentication/signals.py`), y paginación unificada: `config/pagination.py` define `ListPagination` (15), usada en activity/errors de admin y notificaciones (`ActivityPagination` eliminado). +7 tests del servicio de enrollment en `course/tests.py`.
- **Revisión arquitectura (punto 2):** la estructura de apps (course, authentication, grading, teams, assignments, notifications + config) es sólida y se mantiene; los **estados del curso** ya quedan cubiertos por visibilidad + `is_active` + snapshots por borrado (no hace falta `is_closed`); la **estandarización de respuestas 4xx** (algunos `Response({...}, 4xx)` ad-hoc) queda como mejora futura fuera de este alcance. El **design system** señalado ahí como pendiente se implementó después por fases independientes (ver nota `Design system` más abajo).
- **Tests backend:** 266 tests en 6 apps (auth, course, grading, teams, assignments, notifications), incluidos 12 de observabilidad, 21 de notificaciones, 7 del servicio de enrollment y 1 de regresión del handler de errores. **Tests frontend:** Vitest + React Testing Library (65 tests: autenticación/interceptor CSRF, AuthProvider, notificationMeta, queryKeys, ProtectedRoute, useGradeMutations, GradesReportPage con validación 0..max + exports, hooks de admisión/join y primitivas del design system Modal/SelectField/TextareaField/Button). El reporte `frontend/coverage/` está en `.gitignore` (no se sube). Durante los tests de la página de reporte se detectó y corrigió un import faltante (`getSectionGradesReport`) que rompía la página en runtime.
- **TanStack Query / cache / polling:** implementados (polling de cursos a 30s, solo pestaña enfocada).
- **Design system (fases 1–4, commits `a97265d`, `67bcf93`, `854b399`, `d96e7f9`):** primitivas en `src/shared/components/ui/` — `Modal` (overlay, cierre por Escape/backdrop/×, `role="dialog"` + `aria-modal`, tamaños md/lg), `SelectField`/`TextareaField` (misma API que `InputField`: `label/name/register/error/helpText/className` + `...rest`; labels asociados con `useId()`, prop `compact` para filtros de toolbar) y `Button` (variantes primary/secondary/outline/soft/neutral/danger/success/ghost, tamaños sm/md/lg). **Botones:** ~27 primarios `bg-indigo-600` + rojos/verdes/grises inline → `<Button>` en ~26 archivos; se dejaron intencionalmente como `<Link>`-botón las páginas de error (Forbidden/Unauthorized/NotFound), el CTA de Landing y el botón "Instalar" del banner oscuro, además de controles de menú/icono de la Navbar. **Modals:** 7 modals de formulario + confirm de `AdminUsersPage` + historial de notas del panel de profesor + `ConfirmModal` reescritos sobre `Modal` (`ConfirmModal` cambió `confirmClassName` → `confirmVariant`, default `"danger"`). **Selects/textareas:** los 23 selects y 4 textareas restantes → `SelectField`/`TextareaField`; solo el select compacto de `Pager` y `FullScreenLoader` se mantienen especializados. Los exports emerald de `GradesReportPage` mapean a `variant="soft"`/`"success"` (cambio de tono sutil). Accesibilidad: labels vinculados con `htmlFor`/`id` vía `useId`. El refactor además redujo chunks (p. ej. GradesPage 24.21→23.02 kB, CourseDetailPage 26.05→24.03 kB). Suite: 65 tests frontend / 266 backend / lint / build todos verdes.

**Esta lista es el backlog técnico.** Cuando termines algo, decime _"ya terminé X"_ y vamos actualizando y tachando.

---

### PR — Mejoras de UX, notificaciones y acceso administrativo (backlog)

| Prioridad | Área             | Tarea                                                                                  | Estado       |
| --------- | ---------------- | -------------------------------------------------------------------------------------- | ------------ |
| P0        | Acceso admin     | Corregir ruta del Admin Dashboard (404)                                                | ✅ Hecho     |
| P0        | Acceso admin     | Autorización backend del panel (solo rol/permiso admin, no confiar en React)           | ✅ Hecho     |
| P0        | Acceso admin     | Feature flag `ADMIN_PANEL_ENABLED` vía `.env` (no sustituye autorización)              | ✅ Hecho     |
| P0        | Acceso admin     | Pruebas: autorizado / sin permisos / no autenticado / flag deshabilitado               | ✅ Hecho     |
| P1        | Calificaciones   | Toast de éxito/error al guardar nota individual y fuera de Team                        | ✅ Hecho     |
| P1        | Calificaciones   | Estado loading + evitar envíos duplicados (multi-clic)                                 | ✅ Ya cubierto (`beginSave`/`savingKey`) |
| P1        | Notificaciones   | Fetch inicial en el primer render del Dashboard (contador no depende del polling)      | ✅ Ya cubierto (fetch inicial + polling 30s) |
| P1        | Notificaciones   | Inicializar unread count antes del polling; el polling solo actualiza                  | ✅ Ya cubierto |
| P1        | Notificaciones   | Preview limitado + acción "Ver todas" (no renderizar todas en el Dashboard)            | ✅ Hecho     |
| P2        | Inscripciones    | Rediseñar CTA de inscripción en Course Detail (Inscribirme / Inscribiendo… / Inscrito / Solicitud enviada) | ✅ Hecho |
| P2        | Inscripciones    | Feedback visual (éxito/solicitud/ya inscrito/error) + anti doble-clic                  | ✅ Hecho     |
| P2        | UX/UI            | Componente `Button` compartido en Super Admin (variantes y tamaños)                    | ✅ Hecho     |

#### Notas de la PR

- **Acceso admin:** `ADMIN_PANEL_ENABLED=true` en `.env`. Si el panel está deshabilitado, nadie accede aunque tenga permisos; la autorización se valida siempre en backend y los no autorizados reciben la respuesta definida por la política del proyecto.
- **Calificaciones:** feedback visible confirmando guardado/error y estado de carga; comportamiento consistente entre nota individual, nota fuera de Team y notas de Team.
- **Notificaciones:** separar carga inicial, unread count, preview limitado y polling (el polling actualiza el estado existente, no lo inicializa).
- **Inscripción (Course Detail):** el CTA refleja cada estado (puede inscribirse, en proceso, completado, pendiente de aprobación, ya inscrito, error).
- **Super Admin UI:** estandarizar tamaño, padding, tipografía, border-radius, estados hover/active/disabled/loading vía componente compartido (variantes Primary/Secondary/Danger/Ghost, tamaños sm/md/lg).
- **Orden de implementación:** P0 (acceso admin) → P1 (calificaciones + notificaciones) → P2 (Course Detail + Super Admin UI).
- **Verificación extra (junto a la PR):** `TeamIsolationTests` en `teams/tests.py` (12 escenarios: no-miembro 404 en team ajeno, teacher de otro curso 404, miembro común 403 en gestión de equipo, leader 200) y cierre de JWT en `RefreshCsrfSyncTests` (rotación + blacklist del token viejo, blacklist en logout, sincronización CSRF). `ADMIN_PANEL_ENABLED` se expone al frontend como `isAdminPanelEnabled` (flag ausente = habilitado) y oculta los ítems admin de la navbar y la ruta `/admin`.
- **Django admin movido a `/django-admin/`:** para eliminar el choque con la ruta `/admin` de la SPA de React (que se veía como 404), el panel de Django/DRF ahora vive en `/django-admin/` (`config/urls.py`, catch-all de la SPA actualizado). `CspMiddleware` excluye `/django-admin/…` de la política CSP estricta (los scripts inline del admin no calzan con los hashes del index.html); API y SPA mantienen CSP. En dev, Vite proxea `/django-admin` hacia el backend. El panel React agrega un link "Admin de Django (base de datos)" (nueva pestaña). Test de regresión: `config/tests.py` (`CspMiddlewareTests`, 3 tests). Independiente siempre del flag `ADMIN_PANEL_ENABLED` y de `IsSuperuser`.