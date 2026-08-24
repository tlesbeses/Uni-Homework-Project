const CSRF_COOKIE_NAME = "csrftoken";

// El backend entrega el token en /auth/csrf/ y lo rota en login/refresh,
// devolviendo siempre el valor vigente en el cuerpo de la respuesta. Se
// guarda en memoria porque con la API en otro origen document.cookie no
// puede leer sus cookies; la lectura de cookie queda como respaldo para
// el despliegue same-origin antes del primer fetch.
let cachedCsrfToken = null;

export function setCsrfToken(token) {
    cachedCsrfToken = token;
}

export function getCsrfToken() {
    if (cachedCsrfToken) {
        return cachedCsrfToken;
    }
    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
}
