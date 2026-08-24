# EduNotas Backend

Django 6 + Django REST Framework API.

## Requisitos

- Python 3.14
- Pipenv (`pip install pipenv`)

## Puesta en marcha local

```bash
pipenv install
cp .env.example .env   # luego edita los valores
pipenv run python manage.py migrate
pipenv run python manage.py runserver
```

Para desarrollo local puedes poner `DEBUG=True` en `.env`.

## Variables de entorno

Se cargan desde `backend/.env` (via `python-dotenv`) o del entorno del proceso.
Copia `.env.example` como punto de partida. Nunca hagas commit del `.env` real.

| Variable        | Obligatoria | Default               | Notas                                                                     |
| --------------- | ----------- | --------------------- | ------------------------------------------------------------------------- |
| `SECRET_KEY`    | Sí (prod)   | `None`                | El servidor no arranca sin ella. Genera una con `get_random_secret_key()` |
| `DEBUG`         | No          | `False`               | Solo usar `True` en desarrollo local                                      |
| `ALLOWED_HOSTS` | Sí (prod)   | `localhost,127.0.0.1` | Separada por comas. Debe incluir el hostname de Render                    |
| `DATABASE_URL`  | No          | SQLite local          | En producción, la URL Postgres que expone Render                          |
| `CORS_ALLOWED_ORIGINS` | No   | orígenes Vite locales | Frontends autorizados (CORS con credenciales), separados por comas        |
| `AUTH_COOKIE_SAMESITE` | No   | `Lax`                 | `None` solo si frontend y API están en sitios distintos (fuerza Secure)   |

### Frontend en otro origen

Por defecto el despliegue es same-origin: Django sirve el build del SPA
(`frontend/dist`) y las cookies de sesión funcionan sin CORS. Si el frontend
se hospeda por separado (p. ej. Vercel apuntando a la API en Render):

1. Agrega el origen del frontend a `CORS_ALLOWED_ORIGINS`.
2. Define `AUTH_COOKIE_SAMESITE=None` para que el navegador envíe las cookies
   entre sitios (se marcan Secure automáticamente).
3. El token CSRF llega en el cuerpo de `/auth/csrf/`, login y refresh; el
   frontend lo guarda en memoria y no depende de leer cookies.

## Despliegue (Render)

1. En el dashboard del servicio, define las variables:
   - `SECRET_KEY`: valor generado, nunca el de desarrollo.
   - `ALLOWED_HOSTS`: `uni-homework-project.onrender.com` (agrega dominios extra si aplican).
   - `DATABASE_URL`: la "Internal Database URL" de la base Postgres del proyecto.
2. Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
3. Start: `gunicorn config.wsgi:application`

Sin `ALLOWED_HOSTS` con el hostname público, las peticiones devuelven `DisallowedHost`.
Sin `SECRET_KEY`, el proceso falla al arrancar.

## Tests

```bash
pipenv run python manage.py test
```
