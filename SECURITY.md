# Tabla de implementaciones: Seguridad + Polling

Resumen del estado y las acciones pendientes sobre la seguridad de la aplicación y el polling de datos.

## Tabla

| # | Área | Tipo de cambio | ¿Toca infraestructura? | Estado | Acción |
|---|------|----------------|------------------------|--------|--------|
| 1 | **Polling cursos** | Frontend (TanStack `refetchInterval: 30s`, solo pestaña enfocada) | ❌ No | ✅ **Hecho** (commit `9d4470e` en `pollin-implementations`) | Listo |
| 2 | **CSP en modo bloqueo** | Config Django | ❌ No | ✅ **Hecho** (`config/middleware.py` + `settings.py`, `CSP_APPLY` default True; omite en DEBUG) | `script-src` con hash del splash inline; `style-src 'unsafe-inline'`; `object-src 'none'`; `frame-ancestors 'none'` |
| 3 | **Throttles por endpoint** | Código Django | ❌ No | ✅ **Hecho** (`AdminThrottle`/`GradeThrottle` en `authentication/throttle.py`; `admin` 20/min, `grade` 60/min) | Montados en `ImpersonateView`, `AdminUserViewSet`, `AdminActivityView`, `GradeTeamView`, `GradeStudentView` |
| 4 | **Autorización por rol en cada GET** | Código Django | ❌ No | ✅ **Verificado** (auditoría) | `get_queryset` filtra por rol en courses/grades/dashboard/enrollments; IDOR cubierto en `CourseViewSet`/`GradeViewSet` |
| 5 | **Validación server-side estricta** | Código Django | ❌ No | ✅ **Hecho** | Serializers (`validate_score`/`validate_max_score`/`validate_due_date`/`validate_student`/`validate_team`…) + `model.clean()` + `CheckConstraint` en BD (score 0..max, visibilidad, status matrícula, categoría/parcial, % 0..100) |
| 6 | **Cookies reforzadas** | Config Django | ❌ No | ✅ **Hecho (decisión: sin `__Host-`)** | Refresh cookie `HttpOnly` + `Secure` en prod + `SameSite` configurable; CSRF cookie `Secure` en prod. Prefijo `__Host-` descartado: rompe el desarrollo local por HTTP (el browser lo rechaza sin HTTPS) y no aporta nada en el despliegue same-origin actual (ver nota) |
| 7 | **Headers de seguridad** | Config Django | ❌ No | ✅ **Hecho** | `nosniff`, `Referrer-Policy: same-origin`, HSTS (1 año + subdominios + preload), `frame-ancestors 'none'` vía CSP |
| 8 | **Postgres** | Infraestructura | ⚠️ Sí | ✅ Ya en uso | — |
| 9 | **Redis** | Infraestructura | ⚠️ Sí | 🟡 Solo si 2+ instancias | Configurar `REDIS_URL` |
| 10 | **Escalar instancias** | Infraestructura | ⚠️ Sí | 🟡 Solo si creces | Plan/instancias Render |
| 11 | **WAF/Cloudflare** | Infraestructura | ⚠️ Sí | 🔵 Opcional | Solo si crece mucho |
| 12 | **EventLog / auditoría** | Código | ❌ No | ✅ Hecho | Impersonación + calificaciones + cursos (CRUD/settings/inscripciones) + usuarios/roles |
| 13 | **Secretos** | Config | ❌ No | ✅ Hecho | — |

---

## Resumen de estado

- **Hecho:** 1 (polling cursos), 2 (CSP bloqueo), 3 (throttles), 4 (autorización por rol verificado), 5 (validación server-side), 6 (cookies, decisión `__Host-`), 7 (headers de seguridad), 8 (Postgres), 12 (EventLog/auditoría ampliada), 13 (secretos).
- **Pendiente prioritario (bajo coste, sin infra):** ninguno por ahora.
- **Solo si creces:** 9 (Redis), 10 (instancias), 11 (WAF).

## Nota de orden

El **punto 4 (autorización por rol)** debe ir **antes** de ampliar cualquier carga extra al servidor. Como el polling ya está hecho solo en cursos, no hay conflicto; pero conviene garantizar el punto 4 antes de cualquier otro polling futuro.

## Notas adicionales

- **Cookies (`__Host-`) — decisión:** las cookies ya viajan con `Secure` en producción y `HttpOnly` en el refresh token. El prefijo `__Host-` exigiría además HTTPS obligatorio en todos los orígenes (rompe el dev local por `http://localhost`) y no suma defensa real contra el doble-envío CSRF ni XSS en el despliegue same-origen actual (Django sirve el SPA). Se mantiene la configuración actual y se revisa si el frontend migra a otro origen.
- **Referrer-Policy:** `SECURE_REFERRER_POLICY = "same-origin"` (`backend/config/settings.py`), activo junto al resto de headers en producción.