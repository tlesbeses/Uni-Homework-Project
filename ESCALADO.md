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

---

## Resumen ejecutivo

- El cuello de la app no es que "se rompa" con carga, sino que **se pone lenta**
  (0% errores incluso a 100 usuarios). El **login (hash PBKDF2) es el hotspot**:
  es trabajo de CPU pura y queda serializado por el GIL de cada proceso.
- **Threads** sirven para absorber esperas de I/O (multiplican la espera);
  **workers/procesos** aportan paralelismo real (multiplican la potencia). El
  paralelismo de CPU en Python exige procesos: cada worker tiene su propio GIL
  y puede usar un núcleo distinto de la máquina.
- Más `--workers` dentro de UNA instancia y subir de plan (más RAM/vCPU) son
  **escalado vertical**. Varias instancias detrás del load balancer es
  **horizontal** (en Render solo en planes pagos).
- Tu PC tiene 8 núcleos físicos pero la sonda local usó **1 proceso = 1 GIL =
  1 núcleo**: por eso "se trababa" con potencia sobrando. Los 7 núcleos
  restantes estuvieron ociosos.
- **Concurrentes activos ≠ usuarios registrados.** El test "100 usuarios"
  significa 100 personas martillando sin pausa (worst case). En la realidad,
  los usuarios leen, piensan y entran en ráfagas.

## Estimación de usuarios por plan (extrapolada de la sonda local)

| Plan | CPU | Techo cómodo (p95 < 300 ms) | Techo degradado (lento pero vivo) |
|---|---|---|---|
| Free | 0.1 | ~2-5 | ~8-15 |
| Starter ($7) | 0.5 | ~8-15 | ~30-50 |
| Standard ($25) | 1 | ~20-40 | ~80-120 |
| Pro ($85) | 2 | ~50-100 | ~200+ |

Regla práctica de conversión para una app de curso: **~10× concurrentes ≈
usuarios registrados activos** (no todos están online a la vez).

## El caso real que lo valida

Con **110-130 usuarios registrados entrando en tandas de ~30**, la app
funcionó super bien (y no eran 30 personas disparando requests todo el
tiempo; eran ráfagas de 1-2 requests por persona al entrar + lecturas). Ese
patrón real equivale a picos de ~5-15 req/s, muy lejos de saturar un worker.
Con tandas de entrada + lecturas, **Starter (0.5 vCPU + 2 workers) se maneja
cómodo hasta ~200-300 usuarios registrados**; el roce llegaría con cientos
haciendo algo a la vez o con carga de escritura intensa.

## Workers recomendados por plan de Render (2026)

Regla: `workers ≈ núcleos del plan`, con RAM suficiente (~150-250 MB por
worker con Django+DRF).

| Plan | CPU | RAM | Precio | Workers recomendados |
|---|---|---|---|---|
| Free | 0.1 | 512 MB | $0 | 1 |
| Starter | 0.5 | 512 MB | $7/mo | 2 (threads 4) |
| Standard | 1 | 2 GB | $25/mo | 2-3 (threads 4) |
| Pro | 2 | 4 GB | $85/mo | 2-4 (threads 4-8) |
| Pro Plus | 4 | 8 GB | $175/mo | 4-8 |

- Free: CPU ínfimo + duerme a los 15 min + no permite múltiples instancias.
- Starter/Free: con 0.5 CPU o menos, más workers no multiplican el login
  (falta CPU que repartir).
- El salto real para el perfil de esta app (login por hash) está en
  **Standard→Pro**, donde 1-2 núcleos dedicados aceleran el login de verdad.

## Alternativas de despliegue (2026)

| Plataforma | Costo típico | Cuándo elegirla |
|---|---|---|
| **Render** (actual) | $0 demo / $7+ | Simplicidad + ya está armado; ideal para el proyecto |
| **Railway** | ~$5-15/mo (uso) | Mejor precio para apps chicas; auto-detecta Django |
| **Fly.io** | ~$3-12/mo | Múltiples regiones; requiere más control (Docker) |
| **DigitalOcean droplet** | ~$4-6/mo | Lo más barato "real", pero gestionás actualizaciones/backups |
| Heroku | (sin free tier) | Más caro, legado |
| Vercel | — | No recomendable para Django síncrono con sesiones |

## Protocolo de medición (sin tocar producción)

Para confirmar en tu entorno real sin riesgos: usar una **réplica/entorno de
Render de prueba** (nunca el servicio de producción) apuntando la misma sonda
de Locust (`backend/loadtest/`) y comparar req/s y p95. También se puede
escalar temporalmente el entorno de prueba al plan candidato antes de decidir
el pago. Los números de este documento son orientativos de la máquina local y
subestiman lo que da Render (multicore + gunicorn + Postgres gestionado).