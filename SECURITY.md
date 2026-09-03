# Tabla de implementaciones: Seguridad + Polling

Resumen del estado y las acciones pendientes sobre la seguridad de la aplicación y el polling de datos.

## Tabla

| # | Área | Tipo de cambio | ¿Toca infraestructura? | Estado | Acción |
|---|------|----------------|------------------------|--------|--------|
| 1 | **Polling cursos** | Frontend (TanStack `refetchInterval: 30s`, solo pestaña enfocada) | ❌ No | ✅ **Hecho** (commit `9d4470e` en `pollin-implementations`) | Listo |
| 2 | **CSP en modo bloqueo** | Config Django | ❌ No | 🔴 Pendiente | Pasar de `Report-Only` a `Content-Security-Policy` real (afinar `script-src`, `style-src`, `connect-src`) |
| 3 | **Throttles por endpoint** | Código Django | ❌ No | 🔴 Pendiente | Throttle bajo para `impersonate`, `grade-student/team`, `admin/*` |
| 4 | **Autorización por rol en cada GET** | Código Django | ❌ No | 🔴 Pendiente | Revisar que cursos/grades/dashboard devuelvan solo lo del rol |
| 5 | **Validación server-side estricta** | Código Django | ❌ No | 🟠 Pendiente | Validar score, visibilidad, fechas en serializers |
| 6 | **Cookies reforzadas** | Config Django | ❌ No | 🟠 Pendiente | Prefijo `__Host-`, `Secure`, `SAMESITE` |
| 7 | **Headers de seguridad** | Config Django | ❌ No | 🟠 Pendiente | `nosniff`, `Referrer-Policy`, `frame-ancestors`, HSTS |
| 8 | **Postgres** | Infraestructura | ⚠️ Sí | ✅ Ya en uso | — |
| 9 | **Redis** | Infraestructura | ⚠️ Sí | 🟡 Solo si 2+ instancias | Configurar `REDIS_URL` |
| 10 | **Escalar instancias** | Infraestructura | ⚠️ Sí | 🟡 Solo si creces | Plan/instancias Render |
| 11 | **WAF/Cloudflare** | Infraestructura | ⚠️ Sí | 🔵 Opcional | Solo si crece mucho |
| 12 | **EventLog / auditoría** | Código | ❌ No | ✅ Hecho | — |
| 13 | **Secretos** | Config | ❌ No | ✅ Hecho | — |

---

## Resumen de estado

- **Hecho:** 1 (polling cursos), 8 (Postgres), 12 (EventLog), 13 (secretos).
- **Pendiente prioritario (bajo coste, sin infra):** 2 (CSP), 3 (throttles), 4 (autorización por rol) → luego 5, 6, 7.
- **Solo si creces:** 9 (Redis), 10 (instancias), 11 (WAF).

## Nota de orden

El **punto 4 (autorización por rol)** debe ir **antes** de ampliar cualquier carga extra al servidor. Como el polling ya está hecho solo en cursos, no hay conflicto; pero conviene garantizar el punto 4 antes de cualquier otro polling futuro.