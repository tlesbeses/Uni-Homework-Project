# Datos, logs y análisis

Documento informativo sobre **qué registra la aplicación, qué conserva y
qué borra**, y cómo sacar el historial para estudios de *data analysis*
(pandas, Excel, notebooks). No es un plan de ejecución: describe el
comportamiento real del código y las decisiones detrás.

## Objetivo

El historial de eventos se **conserva completo** para poder analizarlo más
adelante (adopción por rol, uso por curso, actividad por franja horaria,
detección de comportamiento anómalo, etc.). A esta escala el volumen es
mínimo: ~200 bytes por evento. Aun con 1000 logins diarios serían apenas
~70 MB al año, y las consultas siguen siendo rápidas por los índices
existentes.

## Inventario de lo que se registra

| Registro | Contenido | ¿Se borra? |
| --- | --- | --- |
| **`EventLog`** | `login`, `create`, `update`, `delete`, `impersonate`, `password_reset`, `terms_accepted`. Con `actor`, `target`, `entity_type`, `entity_id`, `metadata` (JSON) y `created_at` | **No** (salvo retención de logins *si se configura*; ver abajo) |
| **`ErrorLog`** | Errores 500 de la API y errores reportados por el frontend. Con `error_id`, `source`, `kind`, `message`, `path`, `method`, `status_code` y `created_at` | **No** |
| **`Notification`** | Notificaciones in-app del usuario | Las **leídas** con más de 30 días se barren de forma perezosa (son contenido de UI, no datos de análisis) |
| **Snapshots** | Capturas del estado de cursos/secciones antes de borrarlos | **No** |

### Índices de `EventLog`

```python
indexes = [
    models.Index(fields=["action", "-created_at"]),  # métricas por acción/fecha
    models.Index(fields=["actor"]),                  # actividad por usuario
    models.Index(fields=["target"]),                 # actividad sobre un usuario
]
```

Los agregados del panel (`GET /auth/admin/login-stats/`) filtran por
`action` + rango de fechas, de modo que las filas viejas **no** ralentizan
la consulta: el índice `(action, -created_at)` las descarta sin escanear la
tabla completa.

## Retención de los logins

Los eventos de login son los únicos con retención configurable. La variable
`EVENTLOG_LOGIN_RETENTION_DAYS` (ver `backend/.env.example`) controla el
comportamiento:

- **Vacía o `0` (default):** **no se purga nada**. El historial completo de
  logins queda disponible para análisis.
- **Un entero > 0:** al consultar `GET /auth/admin/login-stats/` (cuando un
  admin abre la pestaña *Accesos*), se borran de forma perezosa los eventos
  de login más viejos que ese plazo. La respuesta expone `retention_days`
  para que el frontend muestre el texto correcto (*"Los logins se conservan
  N días"* o *"por tiempo indefinido"*).

> **Nota de rendimiento:** no purgar es **más barato** que purgar. El borrado
> genera bloqueos, *dead tuples* y escritura en WAL; conservar solo ocupa
> disco (mínimo). Por eso el default es conservar.

## Borrado de usuarios: por qué el historial sobrevive

`EventLog.actor` y `EventLog.target` usan `on_delete=models.SET_NULL`. Esto
significa que **los eventos sobreviven al usuario**:

- **Desactivación** (`is_active=False`, el caso normal desde el panel): el
  usuario sigue existiendo, así que sus eventos conservan el vínculo.
- **Borrado físico** (excepcional/manual): el usuario desaparece, pero sus
  eventos en `EventLog` **no se borran**: quedan con `actor = NULL` y/o
  `target = NULL`. El evento se **anonimiza** (se pierde el nombre, no el
  hecho) y sigue contando para estadísticas agregadas.

Además, los eventos sobre entidades borradas (cursos, notas, matrículas,
tareas) también sobreviven: `entity_type` + `entity_id` quedan como
referencia histórica aunque la entidad ya no exista. En las exportaciones,
un `actor_id`/`actor_username` vacío indica exactamente eso: un actor ya
borrado (o un evento sin actor, como una acción del sistema).

Esto es deliberado: la **auditoría y el análisis** no deberían perder
historia porque una cuenta se dé de baja.

## Cómo exportar los datos

### Endpoint web (desde el panel)

`GET /auth/admin/export-events/` (solo superusuarios) devuelve el resultado
**completo, sin paginar**, como descarga:

| Param | Valores | Descripción |
| --- | --- | --- |
| `file_format` | `csv` (default) / `json` | Formato de salida |
| `action` | p. ej. `login`, `update` | Filtra por acción. **Sin este param se excluyen los logins**, igual que el listado de actividad |
| `include_logins` | `true` / *(vacío)* | Incluye también los logins en la exportación (equivale a los botones **"Todo CSV" / "Todo JSON"**) |
| `entity_type` | p. ej. `course`, `grade` | Filtra por entidad |
| `user_id` | entero | Eventos donde el usuario es `actor` **o** `target` |
| `from` / `to` | `AAAA-MM-DD` | Rango de fechas inclusive |

El frontend expone en `AdminActivityPage`:

- **"Exportar CSV" / "Exportar JSON"**: exportan **lo que se ve** en la
  pestaña activa (Actividad = cambios del sistema, sin logins; Accesos =
  solo `action=login`).
- **"Todo CSV" / "Todo JSON"** (solo en Actividad): un único archivo con
  **todos** los eventos, incluyendo logins (`include_logins=true`). Pensado
  para análisis de datos, sin mezclar los logins en la tabla.

> El param se llama `file_format` y **no** `format` porque DRF reserva
> `format` como override de renderer.

### Desde la terminal

```bash
# Todo el historial (excluye logins, como el listado)
python manage.py export_events --format csv --output eventos.csv

# Solo logins desde el 1 de enero
python manage.py export_events --format json --action login --from 2026-01-01

# Actividad de un usuario
python manage.py export_events --user-id 3 --output usuario-3.csv
```

Sin `--output` imprime en la terminal. Sin `--format`, usa `json` si el
archivo termina en `.json` y `csv` en cualquier otro caso.

### Columnas del CSV

```
id, created_at, action, entity_type, entity_id,
actor_id, actor_username, target_id, target_username, metadata
```

`metadata` es JSON (en CSV se serializa como string). Las celdas que
empiezan con `=`, `+`, `-` o `@` se **neutralizan** anteponiendo `'` para
evitar *CSV injection* al abrir el archivo en Excel/Sheets.

### Ejemplo con pandas

```python
import pandas as pd

df = pd.read_csv("eventos.csv", parse_dates=["created_at"])

# Logins por día
df[df.action == "login"].groupby(df.created_at.dt.date).size()

# Usuarios únicos por día
(df[df.action == "login"]
   .groupby(df.created_at.dt.date)["actor_id"]
   .nunique())
```

## Resumen

- **Nada de auditoría se borra por defecto**; solo las notificaciones leídas
  viejas (UI).
- Los **usuarios borrados no borran su historia**: los eventos se anonimizan
  (`SET_NULL`).
- La retención de logins es **opcional** (`EVENTLOG_LOGIN_RETENTION_DAYS`) y
  por defecto indefinida.
- El historial se puede llevar a **CSV/JSON** desde el panel o la terminal.
