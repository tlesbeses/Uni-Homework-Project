# EduNotas

Aplicación web de gestión académica para profesores y estudiantes: cursos, secciones, equipos, tareas y calificaciones. Incluye soporte PWA, exportación de notas a Excel, autenticación por roles (Estudiante / Profesor / Admin), **impersonación de superusuario**, **registro de actividad** y un **panel de administración** de usuarios y eventos.

**Frontend:** React 19 + Vite + Tailwind CSS 4 + TanStack Query (SPA en español)

**Backend:** Django 6 + Django REST Framework (API REST)

---

## Tabla de contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Puesta en marcha local](#puesta-en-marcha-local)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Build unificado](#build-unificado-script)
- [Variables de entorno](#variables-de-entorno)
- [API](#api)
- [Modelos de datos](#modelos-de-datos)
- [Autenticación y seguridad](#autenticación-y-seguridad)
- [Impersonación y auditoría](#impersonación-y-auditoría)
- [Despliegue a producción](#despliegue-a-producción)
  - [Render (backend)](#render-backend)
  - [Frontend en otro origen](#frontend-en-otro-origen)
- [Scripts útiles](#scripts-útiles)
- [Tests](#tests)
- [Licencia](#licencia)

---

## Características

- **Gestión de cursos** — Los profesores crean cursos (públicos o privados). Cada curso genera un **código de acceso de 8 caracteres** único y se crea con al menos una **sección** (p. ej. "1TS1"). Se puede alternar visibilidad, estado activo/inactivo y aceptación automática de alumnos.
- **Inscripción** — Los estudiantes se inscriben mediante código (curso privado) o navegando/enrrollándose en cursos públicos. Las solicitudes pasan por estados `PENDING`, `APPROVED` y `REJECTED`; los profesores las aprueban o rechazan.
- **Tareas (assignments)** — Los profesores crean tareas por curso con título, descripción, puntuación máxima, fecha límite opcional y estado publicado/borrador (los borradores se ocultan a los estudiantes).
- **Equipos** — Dentro de cada sección, los estudiantes forman equipos liderados por un líder. El sistema garantiza **un equipo por estudiante por curso**. Líderes y profesores pueden añadir/quitar miembros y cambiar el liderazgo.
- **Calificación** — Los profesores califican a un **equipo completo** (una nota aplicada a todos los miembros, con anulaciones individuales preservadas) o a un **estudiante individual**. Las notas están restringidas a `0 <= nota <= max_score`.
- **Autoguardado de notas** — Las calificaciones se guardan **automáticamente** al salir de cada campo (blur) y al cambiar de evaluación o de curso, de modo que las notas tecleadas nunca se pierdan aunque el usuario no pulse el botón guardar. El botón "✓" (individual) y "Aplicar a todos" (equipo) se mantienen; el valor `0` se guarda como nota válida y un campo vacío **no** borra una nota existente.
- **Informes / Exportación** — Los profesores ven un informe por sección (matriz de estudiantes × tareas con totales) y lo **exportan a Excel (.xlsx)**.
- **Paneles de control** — Paneles específicos por rol (profesor vs. estudiante) con cursos, inscripciones, notas y tareas.
- **PWA** — Progressive Web App con banner de instalación, splash screen, manifest personalizado y service worker servido por Django.
- **Control de acceso por roles** — Los usuarios pertenecen a grupos de Django (`Student`, `Teacher`, `Admin`). Los superusuarios omiten todas las comprobaciones de permisos.
- **Impersonación de superusuario** — Un superusuario puede **ver la aplicación como otro usuario** (banner de impersonación persistente), para depurar y revisar el sistema desde otras cuentas.
- **Registro de actividad (auditoría)** — Cada acción relevante (login, impersonación, gestión de cursos/equipos/tareas/notas, cambios en usuarios) genera un **EventLog** con autor, acción, destino y metadatos.
- **Panel de administración** — Los superusuarios gestionan usuarios (activar/desactivar, asignar roles) y revisan el **historial de actividad** con filtros.

---

## Arquitectura

```
┌──────────────────────┐        ┌──────────────────────────────┐
│   React SPA (Vite)   │        │       Django 6 + DRF         │
│                      │  /api  │                              │
│  react-router-dom    │───── ─▶│  SimpleJWT + Djoser (auth)   │
│  react-hook-form+zod │  /auth │  REST framework              │
│  TanStack Query      │        │  PostgreSQL / SQLite         │
│  axios (interceptors)│        │  openpyxl (export xlsx)      │
│  Tailwind CSS 4      │        │  Whitenoise + Gunicorn       │
│  vite-plugin-pwa     │        │  impersonation + EventLog    │
└──────────────────────┘        └──────────────────────────────┘
         │                                  │
         └──────── same-origin (prod) ──────┘
         (Django sirve frontend/dist; cookies sin CORS)
```

En producción Django sirve el build del SPA (`frontend/dist`) same-origin: las cookies de sesión funcionan sin CORS. Si el frontend se hospeda aparte (p. ej. Vercel), se configura CORS y cookies cross-site (ver [Frontend en otro origen](#frontend-en-otro-origen)).

---

## Tecnologías

### Frontend

| Tecnología           | Versión | Uso                        |
| -------------------- | ------- | -------------------------- |
| React                | ^19.2.7 | UI                         |
| react-dom            | ^19.2.7 | Renderizado DOM            |
| react-router-dom     | ^7.18.1 | Enrutado                   |
| react-hook-form      | ^7.83.0 | Gestión de formularios     |
| @hookform/resolvers  | ^5.5.7  | Validación react-hook-form |
| zod                  | ^4.4.3  | Validación de esquemas     |
| axios                | ^1.18.1 | Cliente HTTP               |
| @tanstack/react-query| ^5.x   | Fetching / caché de datos   |
| react-toastify       | ^11.1.0 | Notificaciones             |
| tailwindcss          | ^4.3.3  | CSS utility-first          |
| @tailwindcss/vite    | ^4.3.3  | Plugin Tailwind para Vite  |
| @vitejs/plugin-react | ^6.0.3  | Plugin React para Vite     |
| vite                 | ^8.1.1  | Build / dev server         |
| vite-plugin-pwa      | ^1.3.0  | Soporte PWA                |
| oxlint               | ^1.71.0 | Linter                     |

### Backend

| Tecnología                    | Versión | Uso                         |
| ----------------------------- | ------- | --------------------------- |
| Django                        | 6.0.7   | Framework web               |
| djangorestframework           | 3.17.1  | API REST                    |
| djangorestframework_simplejwt | 5.5.1   | Autenticación JWT           |
| djoser                        | 2.3.3   | Registro / auth de usuarios |
| django-filter                 | 26.1    | Filtrado de consultas       |
| django-cors-headers           | 4.9.0   | CORS                        |
| dj-database-url               | 3.1.2   | Parsing de `DATABASE_URL`   |
| python-dotenv                 | 1.2.3   | Carga de `.env`             |
| psycopg / psycopg-binary      | 3.3.4   | Driver PostgreSQL           |
| gunicorn                      | 26.0.0  | Servidor WSGI de producción |
| whitenoise                    | 6.12.0  | Servir estáticos            |
| openpyxl                      | 3.1.5   | Exportación Excel (.xlsx)   |
| redis                         | 6.2.0   | Caché en producción         |
| PyJWT                         | 2.13.0  | Soporte JWT                 |
| tzdata                        | 2026.3  | Datos de zona horaria       |

**Python:** 3.14

### Base de datos

- **Desarrollo:** SQLite local (`backend/db.sqlite3`) por defecto, o PostgreSQL vía `DATABASE_URL`.
- **Producción:** PostgreSQL (vía `DATABASE_URL` en Render).

---

## Estructura del proyecto

```
Uni-Homework-Project/
├── build.sh                          # Build/deploy unificado
├── .gitignore
├── README.md
├── backend/                          # Proyecto Django REST
│   ├── .env.example                  # Plantilla de variables de entorno
│   ├── Pipfile / Pipfile.lock        # Deps (Pipenv)
│   ├── requirements.txt              # Deps (pip)
│   ├── manage.py
│   ├── config/                       # Raíz del proyecto Django
│   │   ├── settings.py
│   │   ├── urls.py                   # Rutas raíz (API + SPA catch-all + PWA)
│   │   ├── middleware.py             # CSP Report-Only
│   │   ├── pagination.py             # Paginación (page size 9)
│   │   └── views.py                  # Manifest / Service worker
│   ├── authentication/               # Usuario + JWT + Djoser + CSRF + EventLog
│   ├── course/                       # Cursos, Secciones, Matrículas
│   ├── assignments/                  # Tareas
│   ├── teams/                        # Equipos y miembros
│   ├── grading/                      # Notas + exportación Excel
│   └── common/                       # Modelo abstracto compartido
└── frontend/                         # SPA React
    ├── index.html                    # Splash + branding
    ├── jsconfig.json                 # Alias @ -> src
    ├── vite.config.js                # Build, proxy, PWA, chunks
    ├── public/                       # manifest, iconos, registerSW
    └── src/
        ├── main.jsx                  # Entry point + QueryClientProvider
        ├── app/                      # Layouts, páginas genéricas, router
        ├── pages/                    # Lazy-loaded pages
        ├── features/                 # auth, admin, courses, assignments, teams, grades
        ├── lib/                      # axios, impersonation, queryClient, queryKeys
        └── shared/                   # componentes, hooks, storage, utils, ConfirmModal, FullScreenLoader
```

---

## Requisitos

- **Node.js** ≥ 20 (para el frontend)
- **npm**
- **Python** 3.14
- **Pipenv** (`pip install pipenv`) o **pip** + `venv`
- PostgreSQL (solo para producción; en desarrollo se usa SQLite)

---

## Puesta en marcha local

### Backend

```bash
cd backend
pipenv install                    # o: pip install -r requirements.txt
cp .env.example .env              # copia y edita los valores
pipenv run python manage.py migrate
pipenv run python manage.py createadmin   # opcional: crea superusuario
pipenv run python manage.py runserver     # http://127.0.0.1:8000
```

Para desarrollo local pon `DEBUG=True` en `backend/.env`.

> Nota: el backend puede arrancar solo con SQLite (sin PostgreSQL) para desarrollo.

### Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

El dev server de Vite **hace proxy** de `/api` y `/auth` a `http://127.0.0.1:8000`, por lo que en desarrollo no hace falta configurar URL de API ni CORS.

### Build unificado (`build.sh`)

Script de un solo clic que instala dependencias y construye todo:

```bash
./build.sh
```

Pasos que ejecuta:

1. `cd frontend && npm ci`
2. `npm run build` → genera `frontend/dist`
3. `cd ../backend && pip install -r requirements.txt`
4. `python manage.py migrate`
5. `python manage.py createadmin`
6. `python manage.py collectstatic --no-input`

---

## Variables de entorno

### Backend (`backend/.env` — copia de `.env.example`)

| Variable                                           | Obligatoria        | Default                                         | Notas                                                                                                                                                        |
| -------------------------------------------------- | ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SECRET_KEY`                                       | Sí (prod)          | `None`                                          | El servidor no arranca sin ella. Genera una con `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG`                                            | No                 | `False`                                         | Solo usar `True` en desarrollo local                                                                                                                         |
| `ALLOWED_HOSTS`                                    | Sí (prod)          | `localhost,127.0.0.1`                           | Separada por comas. Debe incluir el hostname público                                                                                                         |
| `DATABASE_URL`                                     | No                 | SQLite local                                    | En producción, la URL Postgres que expone el servicio                                                                                                        |
| `CORS_ALLOWED_ORIGINS`                             | No                 | orígenes Vite locales (`http://localhost:5173`) | Frontends autorizados (CORS con credenciales), separados por comas                                                                                           |
| `CSRF_TRUSTED_ORIGINS`                             | No                 | localhost + hostname Render                     | Orígenes de confianza para validación CSRF, separados por comas                                                                                              |
| `AUTH_COOKIE_SAMESITE`                             | No                 | `Lax`                                           | `None` solo si frontend y API están en sitios distintos (fuerza Secure)                                                                                      |
| `REDIS_URL`                                        | No                 | `(LocMemCache)`                                 | Caché en producción. Al desplegar un servicio Redis se obtiene caché compartida entre workers                                                                |
| `CSP_REPORT_URI`                                   | No                 | —                                               | Activa la cabecera `Content-Security-Policy-Report-Only`                                                                                                     |
| `DJANGO_SUPERUSER_USERNAME` / `EMAIL` / `PASSWORD` | para `createadmin` | `admin` / — / —                                 | Usados por `python manage.py createadmin`                                                                                                                    |

Nunca hagas commit del `.env` real (está en `.gitignore`).

### Frontend (`frontend/.env`)

| Variable       | Obligatoria | Default         | Notas                                                     |
| -------------- | ----------- | --------------- | --------------------------------------------------------- |
| `VITE_API_URL` | No          | (proxy de Vite) | Solo necesaria si el frontend se despliega en otro origen |

En desarrollo el proxy de Vite elimina la necesidad de esta variable.

---

## API

### Autenticación (`/auth/`)

| Método            | Ruta                        | Propósito                                           |
| ----------------- | --------------------------- | --------------------------------------------------- |
| GET / POST        | `/auth/users/`              | Listar / crear usuarios (Djoser)                    |
| GET / PUT / PATCH | `/auth/users/me/`           | Perfil del usuario actual                           |
| POST              | `/auth/users/set_password/` | Cambiar contraseña                                  |
| POST              | `/auth/users/activation/`   | Activación de usuario                               |
| GET               | `/auth/csrf/`               | Obtener token CSRF (cuerpo + cookie)                |
| POST              | `/auth/jwt/refresh/`        | Refrescar access token (lee cookie HttpOnly)        |
| POST              | `/auth/jwt/blacklist/`      | Logout (invalida refresh, limpia cookies)           |
| POST              | `/auth/login/`              | Login (devuelve access token + usuario + csrfToken) |

### Administración e impersonación (`/auth/admin/`)

| Método   | Ruta                        | Propósito                                              |
| -------- | --------------------------- | ----------------------------------------------------- |
| GET      | `/auth/admin/users/`        | Listar usuarios (superusuario)                        |
| PATCH    | `/auth/admin/users/{id}/`   | Activar/desactivar y asignar roles (superusuario)     |
| POST     | `/auth/admin/impersonate/`  | Iniciar/terminar impersonación (superusuario)         |
| GET      | `/auth/admin/activity/`     | Historial de eventos (EventLog), filtrar sin paginar  |

### Cursos (`/api/`)

| Método      | Ruta                                          | Propósito                                            |
| ----------- | --------------------------------------------- | ---------------------------------------------------- |
| CRUD        | `/api/courses/`                               | Cursos (crear/actualizar/eliminar requiere profesor) |
| GET         | `/api/courses/{id}/sections/`                 | Secciones de un curso                                |
| POST        | `/api/courses/join/`                          | Unirse a un curso privado por `join_code`            |
| POST        | `/api/courses/{id}/enroll/`                   | Matricularse en un curso público                     |
| GET / PATCH | `/api/courses/{id}/course_settings/`          | Ajustes (auto-aceptación)                            |
| CRUD        | `/api/sections/`                              | Secciones (solo profesor del curso)                  |
| GET         | `/api/sections/{id}/export-grades/`           | Descargar notas en `.xlsx` (profesor)                |
| GET         | `/api/sections/{id}/grades-report/`           | Matriz de notas JSON (profesor)                      |
| CRUD        | `/api/enrollments/` + `/approve/`, `/reject/` | Matrículas                                           |
| GET         | `/api/dashboard/`                             | Payload de dashboard por rol                         |

### Equipos (`/api/`)

| Método     | Ruta                                    | Propósito                |
| ---------- | --------------------------------------- | ------------------------ |
| CRUD       | `/api/teams/`                           | Equipos                  |
| GET / POST | `/api/teams/{id}/members/`              | Listar / añadir miembros |
| DELETE     | `/api/teams/{id}/members/{student_id}/` | Eliminar miembro         |
| GET        | `/api/teams/{id}/available-students/`   | Estudiantes elegibles    |
| POST       | `/api/teams/{id}/change-leader/`        | Cambiar líder            |

### Tareas (`/api/`)

| Método | Ruta                                    | Propósito                            |
| ------ | --------------------------------------- | ------------------------------------ |
| CRUD   | `/api/assignments/`                     | Tareas (requiere profesor del curso) |
| GET    | `/api/courses/{course_id}/assignments/` | Tareas de un curso                   |

### Calificaciones (`/api/`)

| Método | Ruta                                   | Propósito                        |
| ------ | -------------------------------------- | -------------------------------- |
| GET    | `/api/grades/`                         | Lista de notas (acotada por rol) |
| POST   | `/api/assignments/{id}/grade-team/`    | Calificar a todo un equipo       |
| POST   | `/api/assignments/{id}/grade-student/` | Calificar a un estudiante        |

### Assets PWA

- `/manifest.json` — manifest
- `/sw.js` — service worker
- `/registerSW.js` — registro del SW
- `re_path(...)` — catch-all SPA que sirve `index.html`

---

## Modelos de datos

| Modelo             | App            | Campos clave                                                                                                |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| **User**           | authentication | extiende `AbstractUser`; `email` único opcional                                                             |
| **Course**         | course         | `title`, `description`, `teacher`, `join_code` (único, 8 chars), `visibility` (PRIVATE/PUBLIC), `is_active` |
| **Section**        | course         | `course`, `name` (único por curso)                                                                          |
| **Enrollment**     | course         | `section`, `student`, `status` (PENDING/APPROVED/REJECTED), `approved_at`                                   |
| **CourseSettings** | course         | `course` (OneToOne), `auto_accept_students`                                                                 |
| **Assignment**     | assignments    | `course`, `title`, `description`, `max_score`, `due_date`, `is_published`                                   |
| **Team**           | teams          | `name` (único por sección), `section`, `leader` (PROTECT)                                                   |
| **TeamMember**     | teams          | `team`, `student`, `course` (denormalizado), `joined_at`                                                    |
| **Grade**          | grading        | `assignment`, `student`, `score`, `is_individual`, `graded_by` (PROTECT)                                    |
| **EventLog**       | authentication | `actor`, `action`, `target_type` / `target_id` / `target_label`, `metadata` (JSON)                          |

Reglas de negocio clave:

- **One team per student per course** — restricción a nivel de BD (`unique (student, course)` en `TeamMember`).
- **Puntuación acotada** — `0 <= score <= max_score` (CheckConstraint).
- **Sin doble matrícula** — si una sección de un curso ya acepta al estudiante, no puede matricularse en otra sección del mismo curso. Se impide la auto-matrícula del profesor.

---

## Autenticación y seguridad

- **JWT (SimpleJWT):** access token de **15 min**, refresh de **1 día**, con rotación en cada refresh y blacklisting tras rotar.
- **Refresh en cookie HttpOnly** llamada `refresh_token`, acotada a `/auth/`. El **access token solo vive en memoria** del frontend (no en localStorage), evitando exfiltración por XSS.
- **CSRF double-submit:** token en la cookie `csrftoken` + cabecera `X-CSRFToken`. El token también se devuelve en el cuerpo de `/auth/csrf/`, login y refresh para soporte cross-origin.
- **Djoser** gestiona registro/`me`/`set_password`/activación.
- **Restauración de sesión:** la cookie de refresh genera un nuevo access token y se recarga `/auth/users/me/` al recargar la página.
- **Roles:** grupos de Django (`Student`, `Teacher`, `Admin`). Los nuevos usuarios se asignan automáticamente al grupo `Student` (signal post-save). `User.me` devuelve `roles` y `permissions`.
- **Throttling:** `LoginThrottle` (5/min), `AuthThrottle` (10/min) y throttles globales anónimos/autenticados (50/min). El frontend maneja los errores `429` con UI dedicada.
- **Caché de permisos:** comprobación de pertenencia a grupo cacheada (TTL 5 min) con invalidación vía señal al cambiar grupos.
- **Impersonación restringida a superusuarios:** solo `is_superuser` puede ver como otro usuario; nunca se registra como la identidad real y se muestra un **banner** persistente mientras dure la impersonación.

---

## Impersonación y auditoría

### Impersonación de superusuario

Permite a un **superusuario** iniciar sesión efectiva como otro usuario para inspeccionar el sistema desde su perspectiva (dashboard, cursos, calificaciones, etc.).

- Se inicia desde el **panel de administración** (o accionando sobre un usuario) seleccionando una cuenta objetivo.
- Mientras dura, una **banner fijo** indica "Viendo como <usuario>" con la opción de **terminar la impersonación**.
- Solo los superusuarios tienen el permiso; el resto recibe error `403`.
- La impersonación se registra como evento de auditoría (`action=impersonate_start` / `impersonate_stop`).

### Registro de actividad (EventLog)

Toda acción relevante queda registrada en el modelo **EventLog**, que guarda:

- **actor** — usuario que realizó la acción.
- **action** — verbo normalizado (`login`, `logout`, `course_create`, `team_update`, `grade_save`, `user_activate`, `impersonate_start`, …).
- **target** — entidad afectada (`target_type`, `target_id`, `target_label`).
- **metadata** — datos extra en JSON (p. ej. `score`, `overwrite_individual`).

### Panel de administración

Accesible solo para superusuarios vía el menú de administración, incluye:

- **Gestión de usuarios**: activar/desactivar cuentas y asignar/revocar roles.
- **Historial de actividad**: tabla paginada y filtrable de los últimos eventos del sistema.

---

## Despliegue a producción

### Render (backend)

1. Crea un servicio web apuntando al repo.
2. Define las variables de entorno en el dashboard:
   - `SECRET_KEY`: valor generado, nunca el de desarrollo.
   - `ALLOWED_HOSTS`: `uni-homework-project.onrender.com` (agrega dominios extra si aplican).
   - `DATABASE_URL`: la "Internal Database URL" de la base Postgres del proyecto.
   - Opcionalmente `REDIS_URL` para caché compartida entre workers.
3. **Build command:**
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
   ```
4. **Start command:**
   ```bash
   gunicorn config.wsgi:application
   ```

Sin `ALLOWED_HOSTS` con el hostname público, las peticiones devuelven `DisallowedHost`. Sin `SECRET_KEY`, el proceso falla al arrancar.

### Frontend en otro origen

Por defecto el despliegue es same-origin (Django sirve `frontend/dist`). Si el frontend se hospeda por separado (p. ej. Vercel apuntando a la API en Render):

1. Agrega el origen del frontend a `CORS_ALLOWED_ORIGINS`.
2. Define `AUTH_COOKIE_SAMESITE=None` para que el navegador envíe las cookies entre sitios (se marcan `Secure` automáticamente).
3. El token CSRF llega en el cuerpo de `/auth/csrf/`, login y refresh; el frontend lo guarda en memoria y no depende de leer cookies.
4. Configura `VITE_API_URL` en el frontend apuntando a la API.

---

## Scripts útiles

| Script                                                | Descripción                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `./build.sh`                                          | Build completo (frontend + backend + migraciones + runserver) |
| `npm run dev` (frontend)                              | Dev server Vite                                               |
| `npm run build` (frontend)                            | Build de producción → `dist/`                                 |
| `npm run lint` (frontend)                             | Lint con oxlint                                               |
| `npm run preview` (frontend)                          | Previsualizar build                                           |
| `pipenv run python manage.py runserver` (backend)     | Dev server Django                                             |
| `python manage.py createadmin` (backend)              | Crear/actualizar superusuario desde env                       |
| `python manage.py test` (backend)                     | Ejecutar tests                                                |
| `python manage.py collectstatic --no-input` (backend) | Recoger estáticos                                             |

---

## Tests

```bash
# Backend
cd backend
pipenv run python manage.py test
```

---

## Licencia

Proyecto académico de tarea universitaria. Sin licencia pública específica.
