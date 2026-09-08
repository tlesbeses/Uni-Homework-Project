# Escalado de la aplicación

Documento informativo sobre cómo escalar la arquitectura actual y qué
implicaría cada paso. No es un plan de ejecución: es la guía conceptual y
técnica del stack.

## Arquitectura actual

- **Frontend:** SPA con Vite + React, se sirve con `whitenoise` desde Django
  (`frontend/dist`).
- **Backend:** Django 6 + DRF, **WSGI síncrono** (un hilo atiende una
  petición de principio a fin).
- **Server de producción:** `gunicorn 26` en Render (Linux). En desarrollo
  local no corre gunicorn (es Unix-only) y se usa `waitress`.
- **Base de datos:** PostgreSQL vía `dj-database-url` con `conn_max_age=600`.
- **Caché:** `LocMemCache` por defecto; ya existe el código para usar Redis
  si se define `REDIS_URL` (`config/settings.py`).
- **Autenticación:** JWT (`simplejwt`) + refresh token, no hay sesión de
  servidor.
- **Estados:** todo el estado persistente vive en Postgres. El único estado
  *dentro del proceso* es la caché de throttles (rate limits de DRF).

## Lo que mide el test de carga (baseline local, waitress, 1 proceso)

| Usuarios simultáneos | req/s | p95 | Errores |
|---|---|---|---|
| 15 | ~10 | ~50 ms | 0% |
| 100 | ~58 | ~1.1 s | 0% |

- A 15 usuarios el API va sobrada; a 100 **no falla** pero la latencia se
  degrada (respuestas de 1-3 s).
- El **login es el hotspot**: el hash de contraseña (PBKDF2) es CPU puro, y
  con un solo worker todos los logins se turnan en el mismo núcleo.
- El `POST /api/courses/<id>/enroll/` mostró una cola larga (outlier de
  ~12 s): es la ruta de escritura (lock de fila + auditoría + notificación).
- La medición local **subestima** el rendimiento real de Render (multicore +
  gunicorn + Postgres gestionado). Conviene re-medir en el entorno desplegado.

## Cómo funciona el escalado

Escalar es darle al sistema más capacidad de procesar peticiones a la vez y
garantizar que todas las rutas de acceso compartan el mismo estado.

### 1. Escalado vertical (más poder en una máquina)

Un proceso gunicorn es un **worker**; cada worker puede abrir varios
**threads**.

```
gunicorn config.wsgi:application --workers N --threads 4
```

- Con `N` workers, la carga (incluido el hash del login) se reparte entre
  núcleos.
- Cheap y de alto impacto. Regla típica: `2 * CPUs + 1` workers, con 2-4
  threads por worker.

### 2. Escalado horizontal (más máquinas / réplicas)

Render levanta varias instancias de la app detrás de un load balancer. Solo
funciona bien si las instancias **no guardan estado local**, porque no se
puede garantizar que dos peticiones del mismo usuario caigan en la misma
instancia.

Regla de oro: toda la información tiene que vivir en la BD y en servicios
compartidos (caché/colas), nunca en el proceso.

**Problema actual:** los rate limits de DRF se cuentan en `LocMemCache`
(memoria del proceso). Con 2 instancias cada una contaría sus propios
`5 logins/min` → los límites se duplicarían y serían inconsistentes.

**Solución:** activar **Redis** como caché compartida. El código ya existe:
si `REDIS_URL` está definido, `settings.py` usa `RedisCache`. Redis actúa como
un "buzón común": todas las instancias leen y escriben el mismo contador.

Con Redis además se puede cachear respuestas de las GETs pesadas
(`/api/courses/`, `/api/dashboard/`) con invalidación por señales, evitando
pegar a Postgres en cada request.

Una vez sin estado local, agregar réplicas escala casi linealmente:
2 instancias ≈ 2× throughput.

### 3. Base de datos

El Postgres también puede ser el cuello:

- **Mejor plan de DB** (más CPU/RAM en el servidor de Postgres gestionado).
- **Índices** para que las consultas pesadas hagan menos trabajo. Candidatos:
  - `enrollment(section__course, is_active)`
  - `notification(user, read)`
  - `event_log(actor, action, -created_at)`
  - `grade(section, student)`
- **`CONN_MAX_AGE`** ya está en 600 para reciclar conexiones entre requests.

### 4. Escrituras pesadas

La ruta `enroll` (lock + auditoría + notificación) se puede alivianar moviendo
el trabajo post-request a una **cola en background** (Celery o django-q):
la respuesta vuelve rápido y el trabajo pesado sigue por detrás. Eso requiere
un broker (Redis u otro) y un worker corriendo en un proceso distinto.

## Piezas finales

```
            Usuarios (frontend SPA en Vite)
                     │
        ┌────────────┴────────────┐   (Load Balancer de Render)
     Instancia 1             Instancia 2          ← gunicorn workers × threads
        │                        │
        ├──────► Redis ◄─────────┤                ← caché + rate limits + colas
        └────────────► Postgres ◄┘                ← índices + CONN_MAX_AGE
```

## Orden recomendado de pasos

1. **Workers/threads en gunicorn** — paralelismo real en un nodo, minutos de
   configuración, impacto inmediato (sobre todo en el login).
2. **Redis** — estado compartido; prerrequisito para 2+ instancias y para
   cachear GETs pesadas.
3. **Índices + aliviar `enroll`** — quitar outliers y reducir carga de BD.
4. **Réplicas** — subir el número de instancias una vez que una sola se
   satura razonablemente.

> Nota: medir antes/después con la sonda de Locust (`backend/loadtest/`) en el
> propio entorno de Render; los números locales son solo orientativos.