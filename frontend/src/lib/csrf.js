const CSRF_COOKIE_NAME = "csrftoken";
const SESSION_HINT_COOKIE_NAME = "session_hint";

export function getCsrfToken() {
    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
}

// Cookie no-HttpOnly puesta por el backend al iniciar sesión. Indica que
// existe una sesión sin exponer el token; evita el refresh en cada carga
// de un visitante anónimo.
export function hasSessionHint() {
    return new RegExp(
        `(?:^|;\\s*)${SESSION_HINT_COOKIE_NAME}=`
    ).test(document.cookie);
}
