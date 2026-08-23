const CSRF_COOKIE_NAME = "csrftoken";

export function getCsrfToken() {
    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
}
