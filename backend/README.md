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
