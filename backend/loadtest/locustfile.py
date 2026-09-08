"""Escenarios de test de carga para el API de EduNotas con Locust.

Cada usuario simulado inicia sesión una vez (GET /auth/csrf/ y luego
POST /auth/login/ con doble-envío CSRF, como hace el frontend) y después
recorre endpoints de solo lectura (y un par de escrituras puntuales) según
su rol: estudiante, profesor o admin.

IMPORTANTE: correr contra un backend con los throttles desactivados para
medir la capacidad real del API (ver DISABLE_THROTTLE=1 en settings).

Uso (headless):
  pipenv run locust -f loadtest/locustfile.py -H http://127.0.0.1:8000 \
      -u 20 -r 5 -t 5m --html report.html --csv=results

Cuentas por rol vienen del seed (profesor.demo + estudiantes) y se reutilizan
entre usuarios spawn; por eso la tarea de inscripción acepta 200/201/400 como
éxito (una inscripción duplicada es un 400 de negocio, no un fallo). Ajustá
LOAD_STUDENTS / LOAD_TEACHERS / LOAD_ADMINS / LOAD_PASSWORD por env si querés
otro pool.
"""

import os
import threading

from locust import HttpUser, between, task

STUDENTS = [
    u.strip()
    for u in os.getenv(
        "LOAD_STUDENTS",
        "ana.perez,luis.garcia,maria.lopez,carlos.martin,laura.sanchez,pedro.ramirez",
    ).split(",")
    if u.strip()
]
TEACHERS = [
    u.strip()
    for u in os.getenv("LOAD_TEACHERS", "profesor.demo").split(",")
    if u.strip()
]
ADMINS = [
    u.strip()
    for u in os.getenv("LOAD_ADMINS", "loadadmin").split(",")
    if u.strip()
]
PASSWORD = os.getenv("LOAD_PASSWORD", "Demo1234!")

_PICK_LOCK = threading.Lock()
_PICK_COUNTER = 0


def _pick(accounts):
    global _PICK_COUNTER
    with _PICK_LOCK:
        _PICK_COUNTER += 1
        return accounts[_PICK_COUNTER % len(accounts)]


class ApiUser(HttpUser):
    abstract = True
    wait_time = between(1, 2)

    def login_as(self, username):
        csrf = self.client.get("/auth/csrf/").json()["csrfToken"]
        response = self.client.post(
            "/auth/login/",
            json={"username": username, "password": PASSWORD},
            headers={"X-CSRFToken": csrf},
        )
        self.access_token = response.json().get("access")
        self.headers = {"Authorization": f"Bearer {self.access_token}"}


class StudentUser(ApiUser):
    """Alta frecuencia: catálogo, detalle de curso, dashboard, inscripciones."""

    weight = 3

    def on_start(self):
        self.login_as(_pick(STUDENTS))
        self.courses = []
        self.sections = []
        response = self.client.get("/api/courses/", headers=self.headers)
        rows = response.json().get("results") or []
        self.courses = [row["id"] for row in rows]
        if self.courses:
            sections = self.client.get(
                "/api/sections/",
                params={"course": self.courses[0]},
                headers=self.headers,
            )
            self.sections = [row["id"] for row in sections.json().get("results") or []]

    @task(8)
    def list_courses(self):
        self.client.get("/api/courses/", headers=self.headers)

    @task(6)
    def course_detail(self):
        if not self.courses:
            return
        self.client.get(f"/api/courses/{self.courses[0]}/", headers=self.headers)

    @task(5)
    def dashboard(self):
        self.client.get("/api/dashboard/", headers=self.headers)

    @task(4)
    def list_enrollments(self):
        self.client.get("/api/enrollments/", headers=self.headers)

    @task(1)
    def enroll(self):
        if not self.courses or not self.sections:
            return
        with self.client.post(
            f"/api/courses/{self.courses[0]}/enroll/",
            json={"section": self.sections[0]},
            headers=self.headers,
            catch_response=True,
        ) as response:
            if response.status_code in (200, 201, 400):
                response.success()
            else:
                response.failure(
                    f"unexpected status {response.status_code}"
                )


class TeacherUser(ApiUser):
    """Media frecuencia: lista de sus cursos, dashboard y secciones."""

    weight = 2

    def on_start(self):
        self.login_as(_pick(TEACHERS))
        self.courses = []
        response = self.client.get("/api/courses/", headers=self.headers)
        rows = response.json().get("results") or []
        self.courses = [row["id"] for row in rows]

    @task(8)
    def list_courses(self):
        self.client.get("/api/courses/", headers=self.headers)

    @task(6)
    def dashboard(self):
        self.client.get("/api/dashboard/", headers=self.headers)

    @task(5)
    def sections(self):
        if not self.courses:
            return
        self.client.get(
            "/api/sections/",
            params={"course": self.courses[0]},
            headers=self.headers,
        )


class AdminUser(ApiUser):
    """Baja frecuencia: dashboard admin y consola de usuarios."""

    weight = 1

    def on_start(self):
        self.login_as(_pick(ADMINS))

    @task(6)
    def dashboard(self):
        self.client.get("/api/dashboard/", headers=self.headers)

    @task(4)
    def admin_users(self):
        self.client.get("/auth/admin/users/", headers=self.headers)