/**
 * ¿El usuario necesita (re)aceptar los términos vigentes?
 *
 * El backend expone en el perfil (`me` / login) la versión aceptada
 * (`terms_version`) y la vigente (`terms_current_version`). Se pide re-aceptar
 * cuando no coinciden (incluye a quien nunca aceptó: `terms_version` vacío).
 *
 * Los superusuarios quedan exentos: son operadores del sistema y su cuenta se
 * crea por línea de comandos, no por el registro con aceptación.
 */
export function needsTermsAcceptance(user) {
    if (!user || user.is_superuser) {
        return false;
    }
    const accepted = user.terms_version || "";
    const current = user.terms_current_version || "";
    return accepted !== current;
}
