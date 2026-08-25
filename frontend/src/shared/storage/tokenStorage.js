// El access token vive SOLO en memoria: nunca en localStorage/sessionStorage,
// para que un XSS no pueda robarlo. Se pierde al recargar y se restaura
// mediante el refresh token (cookie HttpOnly) en el arranque de la app.
const LEGACY_KEYS = ["accessToken", "refreshToken", "user"];

let accessToken = null;

export const tokenStorage = {
    getAccessToken: () => accessToken,

    setAccessToken: (token) => {
        accessToken = token;
    },

    clear() {
        accessToken = null;
    },
};

// Limpieza única de credenciales dejadas por versiones anteriores
// que persistían tokens y usuario en localStorage.
export function clearLegacyTokens() {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}
