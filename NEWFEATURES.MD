VSí. Entonces lo mejor es dejar una **checklist maestra de EduNotas** para que después podamos ir marcando qué ya está implementado y qué falta revisar.

También pondría específicamente **refresh token rotation + blacklist** y **sacar información sensible de `localStorage`** como puntos de revisión de seguridad.

### Roadmap / Checklist de EduNotas

| Prioridad   | Área            | Funcionalidad / tarea                                   | Estado          |
| ----------- | --------------- | ------------------------------------------------------- | --------------- |
| 🔴 Alta     | Seguridad       | Rate limiting en login                                  | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Verificar permisos de profesor sobre sus propios cursos | ✅ Verificado   |
| 🔴 Alta     | Seguridad       | Verificar permisos de estudiante sobre sus cursos       | ✅ Verificado   |
| 🔴 Alta     | Seguridad       | Protección contra IDOR / acceso a recursos ajenos       | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Refresh token rotation                                  | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Refresh token blacklist                                 | ✅ Implementado |
| 🔴 Alta     | Seguridad       | Evitar información sensible en `localStorage`           | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CSRF                                                    | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CORS                                                    | ✅ Implementado |
| 🔴 Alta     | Seguridad       | CSP                                                     | 🔍 Revisar      |
| 🔴 Alta     | Seguridad       | HSTS                                                    | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Log de cambios sensibles                                | 🚧 Parcial      |
| 🔴 Alta     | Auditoría       | Registrar cambios de calificaciones                     | ✅ Implementado |
| 🔴 Alta     | Auditoría       | Registrar cambios de cursos                             | ❌ Falta        |
| 🔴 Alta     | Auditoría       | Registrar cambios de usuarios/roles                     | ❌ Falta        |
| 🔴 Alta     | Calificaciones  | Gradebook                                               | ✅ Implementado |
| 🔴 Alta     | Calificaciones  | Cálculo de nota final                                   | ⬜ Pendiente    |
| 🔴 Alta     | Calificaciones  | Ponderaciones por tarea/examen                          | ⬜ Pendiente    |
| 🔴 Alta     | Calificaciones  | Historial de calificaciones                             | 🚧 Parcial      |
| 🔴 Alta     | Testing         | Tests de autenticación                                  | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de permisos                                       | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de API                                            | ✅ Implementado |
| 🔴 Alta     | Testing         | Tests de frontend                                       | ⬜ Pendiente    |
| 🟠 Media    | Cursos          | Estados del curso                                       | 🔍 Revisar      |
| 🟠 Media    | Cursos          | Archivar cursos                                         | ⬜ Pendiente    |
| 🟠 Media    | Cursos          | Polling de cursos (refetchInterval 30s)                 | ✅ Implementado |
| 🟠 Media    | Inscripciones   | Estados de inscripción                                  | ✅ Implementado |
| 🟠 Media    | Usuarios        | Soft delete / desactivación                             | 🚧 Parcial      |
| 🟠 Media    | Notificaciones  | Notificaciones dentro de la aplicación                  | ⬜ Pendiente    |
| 🟠 Media    | Notificaciones  | Notificaciones de nuevas tareas                         | ⬜ Pendiente    |
| 🟠 Media    | Notificaciones  | Notificaciones de nuevas calificaciones                 | ⬜ Pendiente    |
| 🟠 Media    | Reportes        | Reporte de curso                                        | ✅ Implementado |
| 🟠 Media    | Reportes        | Exportar CSV/Excel                                      | 🚧 Parcial      |
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

- **CSP** sigue en modo **Report-Only** (`middleware.py`/`settings.py`) — no bloquea XSS activamente. Falta pasar a modo bloqueo.
- **Auditoría:** calificaciones y gradings quedan registrados en `EventLog`; impersonación también. **Falta** loggear cambios de cursos y de usuarios/roles.
- **Historial de calificaciones:** solo existe el `EventLog` (cambios), no un historial con snapshots/versiones por nota.
- **Exportar:** solo Excel `.xlsx` (openpyxl, con sanitización anti-inyección de fórmulas). No hay CSV ni PDF.
- **Estados del curso:** existe visibilidad (Público/Privado) e `is_active`, pero **no** hay acción de archivar.
- **Desactivación de usuarios:** existe `is_active` con endpoint admin; no hay soft-delete con `deleted_at`.
- **Notificaciones:** no implementadas (solo toasts de cliente).
- **Tests backend:** ~140 métodos en 5 apps (auth, course, grading, teams, assignments). Frontend: sin framework de tests.
- **TanStack Query / cache / polling:** implementados (polling de cursos a 30s, solo pestaña enfocada).

**Yo usaría esta tabla como nuestro backlog técnico.** Cuando vayas terminando cosas, me puedes decir por ejemplo _"ya terminé audit logs"_ y vamos actualizando la lista.