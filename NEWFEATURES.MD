VSí. Entonces lo mejor es dejar una **checklist maestra de EduNotas** para que después podamos ir marcando qué ya está implementado y qué falta revisar.

También pondría específicamente **refresh token rotation + blacklist** y **sacar información sensible de `localStorage`** como puntos de revisión de seguridad.

### Roadmap / Checklist de EduNotas

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
| 🔴 Alta     | Calificaciones  | Gradebook                                               | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Cálculo de nota final                                   | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Ponderaciones por tarea/examen                          | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Historial de calificaciones                             | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de autenticación                                  | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de permisos                                       | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de API                                            | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de frontend                                       | ✅ Implementado |
| 🟠 Media    | Cursos          | Estados del curso                                       | 🚧 Revisar      |
| 🟠 Media    | Cursos          | Archivar cursos                                         | ✅ Implementado |
| 🟠 Media    | Cursos          | Polling de cursos (refetchInterval 30s)                 | ✅ Implementado |
| 🟠 Media    | Inscripciones   | Estados de inscripción                                  | ✅ Implementado |
| 🟠 Media    | Usuarios        | Soft delete / desactivación                             | 🚧 Parcial      |
| 🟠 Media    | Notificaciones  | Notificaciones dentro de la aplicación                  | ⬜ Pendiente    |
| 🟠 Media    | Notificaciones  | Notificaciones de nuevas tareas                         | ⬜ Pendiente    |
| 🟠 Media    | Notificaciones  | Notificaciones de nuevas calificaciones                 | ⬜ Pendiente    |
| 🟠 Media    | Reportes        | Reporte de curso                                        | ✅ Implementado |
| 🟠 Media    | Reportes        | Exportar CSV/Excel                                      | ✅ Implementado |
| 🟠 Media    | Reportes        | Exportar PDF                                            | ⬜ Pendiente    |
| 🟠 Media    | Importación     | Importar estudiantes mediante CSV                       | ⬜ Pendiente    |
| 🟠 Media    | Dashboard       | Dashboard de profesor                                   | ✅ Implementado |
| 🟠 Media    | Dashboard       | Dashboard de estudiante                                 | ✅ Implementado |
| 🟠 Media    | UX/UI           | Estados loading/empty/error                             | ✅ Implementado |
| 🟠 Media    | UX/UI           | Responsive mobile                                       | ✅ Implementado |
| 🟠 Media    | UX/UI           | Design system                                           | 🔍 Revisar      |
| 🟡 Baja     | Notificaciones  | Email notifications                                     | ⬜ Futuro       |
| 🟡 Baja     | Notificaciones  | Push notifications                                      | ⬜ Futuro       |
| 🟡 Baja     | Tiempo real     | WebSockets / actualizaciones en tiempo real             | ⬜ Futuro       |
| 🟡 Baja     | Observabilidad  | Error tracking                                          | ⬜ Futuro       |
| 🟡 Baja     | Observabilidad  | Métricas de API                                         | ⬜ Futuro       |
| 🟡 Baja     | DevOps          | GitHub Actions                                          | ⬜ Futuro       |
| 🟡 Baja     | DevOps          | CI/CD                                                   | ⬜ Futuro       |
| 🟢 Opcional | Analytics       | Estadísticas avanzadas                                  | ⬜ Futuro       |
| 🟢 Opcional | Infraestructura | Redis para cache compartido                             | ⬜ Evaluar      |
| 🟢 Opcional | Infraestructura | Background jobs                                         | ⬜ Evaluar      |

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

### Notas de la auditoría (revisado contra el código)

- **CSP** en **modo bloqueo** (`Content-Security-Policy`, `config/middleware.py` + `settings.py`, activable por defecto; `CSP_APPLY=False` para desactivar, `CSP_REPORT_URI` para monitorizar además). Se omite en DEBUG. Los hashes `script-src` se calculan dinámicamente sobre los scripts inline del `index.html` servido (immune a cambios de build y saltos de línea).
- **Auditoría:** `EventLog` cubre impersonación, calificaciones, cursos (crear/editar/borrar + `course_settings` + inscripciones approve/reject/eliminar) y usuarios/roles (activar/desactivar, cambiar rol), con metadata de cambio desde/hacia.
- **Historial de calificaciones:** `GradeHistory` guarda cada cambio (old/new + actor + fecha) y se consulta vía `GET /api/grades/<pk>/history/`; modal en el panel del profesor.
- **Nota final:** cálculo ponderado server-side (`grading/final.py`, sin calificar cuenta como 0) expuesto en el dashboard; cada tarea tiene `weight`.
- **Exportar:** Excel `.xlsx` (openpyxl, con sanitización anti-inyección de fórmulas) y CSV (UTF-8 con BOM, misma sanitización, columna total). No hay PDF.
- **Estados del curso:** visibilidad (Público/Privado), `is_active` y respaldo de archivar/restaurar (oculta el curso por completo al estudiante; el teacher lo ve para restaurar).
- **Desactivación de usuarios:** existe `is_active` con endpoint admin; no hay soft-delete con `deleted_at`.
- **Throttles por endpoint:** `AdminThrottle` (admin 20/min) en impersonate/admin/users/activity y `GradeThrottle` (grade 60/min) en grade-team/grade-student. `is_active` en el admin ahora exige booleano real (antes `bool("false")` se convertía a `True`).
- **Renovación de sesión:** el interceptor reintenta el refresh tras re-sincronizar el token CSRF si la cookie expiró (403) con la sesión aún viva (p. ej. impersonación inactiva >1 h).
- **Notificaciones:** no implementadas (solo toasts de cliente).
- **Tests backend:** 196 tests en 5 apps (auth, course, grading, teams, assignments). **Tests frontend:** Vitest + React Testing Library (10 tests sobre autenticación/interceptor CSRF y AuthProvider; cobertura inicial con `npm run coverage`).
- **TanStack Query / cache / polling:** implementados (polling de cursos a 30s, solo pestaña enfocada).

**Yo usaría esta tabla como nuestro backlog técnico.** Cuando vayas terminando cosas, me puedes decir por ejemplo _"ya terminé audit logs"_ y vamos actualizando la lista.