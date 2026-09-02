// Estado de la impersonación compartido entre AuthProvider y el interceptor
// de axios. Solo el access token impersonado vive en memoria: el admin
// conserva su refresh token (cookie HttpOnly), de modo que la impersonación
// termina al recargar la página y nunca persiste sesiones ajenas.
let active = false;
let adminAccessToken = null;
let adminProfile = null;
let impersonatedUserId = null;
let impersonatedUser = null;
let onLost = null;

// Decodifica (sin verificar firma) el payload de un JWT: suficiente para
// inspeccionar claims y detectar la pérdida de la impersonación.
function decodeTokenPayload(token) {
    try {
        const payload = token.split(".")[1] ?? "";
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(
            Math.ceil(normalized.length / 4) * 4,
            "="
        );
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export const impersonation = {
    isActive: () => active,

    getState: () => ({
        active,
        adminAccessToken,
        adminProfile,
        impersonatedUserId,
        impersonatedUser,
    }),

    start({
        adminAccessToken: at,
        adminProfile: ap,
        impersonatedUserId: id,
        impersonatedUser: u,
    }) {
        active = true;
        adminAccessToken = at;
        adminProfile = ap;
        impersonatedUserId = id;
        impersonatedUser = u;
    },

    clear() {
        active = false;
        adminAccessToken = null;
        adminProfile = null;
        impersonatedUserId = null;
        impersonatedUser = null;
    },

    // True si el token dado sigue siendo la impersonación activa. Un refresh
    // con la cookie del admin devuelve un token sin personificar y revela la
    // pérdida de la sesión de prueba (caduca con su lifetime normal).
    tokenStillImpersonating(token) {
        if (!active) {
            return false;
        }
        const claims = decodeTokenPayload(token);
        return Boolean(
            claims && Number(claims.user_id) === Number(impersonatedUserId)
        );
    },

    setLostHandler(handler) {
        onLost = handler;
    },

    notifyLost() {
        if (onLost) {
            onLost();
        }
    },
};