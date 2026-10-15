import { Link } from "react-router-dom";
import { LegalDoc, LegalSection } from "../components/LegalDoc";
import { LEGAL_CONTACT_EMAIL } from "../constants";

export const TermsPage = () => (
    <LegalDoc
        title="Términos y Condiciones"
        intro="Estos términos regulan el uso de EduNotas, una aplicación de gestión académica para profesores y estudiantes. Al crear una cuenta y usar la plataforma aceptás estas condiciones."
    >
        <LegalSection heading="1. Aceptación">
            <p>
                Para registrarte debés marcar la casilla de aceptación de estos
                Términos y Condiciones y de la{" "}
                <Link to="/privacy" className="text-indigo-600 hover:underline">
                    Política de Privacidad
                </Link>
                . La aceptación queda registrada con la fecha y la versión
                vigente. Si no estás de acuerdo, no uses la plataforma.
            </p>
        </LegalSection>

        <LegalSection heading="2. Descripción del servicio">
            <p>
                EduNotas permite gestionar cursos, secciones, equipos, tareas y
                calificaciones. Se ofrece con fines educativos y no garantiza
                disponibilidad ininterrumpida; el servicio puede cambiar,
                interrumpirse o suspenderse por mantenimiento o causas técnicas.
            </p>
        </LegalSection>

        <LegalSection heading="3. Cuentas">
            <p>
                Sos responsable de la veracidad de los datos que proporcionás y
                de mantener la confidencialidad de tu contraseña. No compartas
                tu cuenta.
            </p>
            <p>
                Las cuentas nuevas se activan desde el enlace enviado a tu
                correo electrónico. Podés editar tu perfil y cambiar tu
                contraseña desde la configuración; la recuperación de contraseña
                también se realiza por correo.
            </p>
        </LegalSection>

        <LegalSection heading="4. Roles y permisos">
            <p>
                Los usuarios tienen un rol (Estudiante o Profesor) que determina
                qué acciones pueden realizar. Los administradores pueden
                gestionar cuentas y roles y revisar registros de actividad para
                el mantenimiento y la seguridad del servicio.
            </p>
        </LegalSection>

        <LegalSection heading="5. Uso aceptable">
            <p>Te comprometés a no:</p>
            <ul className="list-disc space-y-1 pl-5">
                <li>Introducir datos falsos o suplantar la identidad de otros.</li>
                <li>
                    Manipular calificaciones, matrículas o equipos sin
                    autorización.
                </li>
                <li>
                    Intentar acceder a recursos, cuentas o cursos que no te
                    corresponden.
                </li>
                <li>
                    Usar la plataforma para fines ilegales o para afectar su
                    funcionamiento.
                </li>
            </ul>
        </LegalSection>

        <LegalSection heading="6. Calificaciones y registros académicos">
            <p>
                Las calificaciones y los registros académicos son
                responsabilidad de los profesores y de la institución que los
                carga. La plataforma los almacena, los muestra a los usuarios
                autorizados y registra los cambios de calificaciones para su
                trazabilidad.
            </p>
            <p>
                Las correcciones se solicitan al profesor o al administrador
                correspondiente.
            </p>
        </LegalSection>

        <LegalSection heading="7. Propiedad intelectual">
            <p>
                El nombre, la interfaz y el código de EduNotas pertenecen a sus
                autores. Los datos académicos que cargás siguen siendo de sus
                titulares.
            </p>
            <p>
                La plataforma utiliza componentes de software de terceros bajo
                sus propias licencias.
            </p>
        </LegalSection>

        <LegalSection heading="8. Suspensión y cierre de cuentas">
            <p>
                Podemos desactivar o suspender una cuenta por incumplimiento de
                estos términos, por motivos de seguridad o por mantenimiento.
                También podés solicitar la desactivación de tu cuenta.
            </p>
            <p>
                El tratamiento de los datos una vez cerrada la cuenta se
                describe en la{" "}
                <Link to="/privacy" className="text-indigo-600 hover:underline">
                    Política de Privacidad
                </Link>
                .
            </p>
        </LegalSection>

        <LegalSection heading="9. Limitación de responsabilidad">
            <p>
                El servicio se ofrece "tal cual", en el marco de un proyecto
                académico. No nos hacemos responsables por pérdidas derivadas
                del uso o de la imposibilidad de usar la plataforma.
            </p>
            <p>
                Nada en estos términos excluye responsabilidades que la
                legislación aplicable no permita excluir.
            </p>
        </LegalSection>

        <LegalSection heading="10. Modificaciones">
            <p>
                Podemos actualizar estos términos. Cuando cambie la versión, se
                te pedirá que la aceptes nuevamente al iniciar sesión. La versión
                vigente se muestra al comienzo de este documento.
            </p>
        </LegalSection>

        <LegalSection heading="11. Contacto">
            <p>
                Para consultas, reclamaciones o para reportar un problema de
                seguridad, escribí a{" "}
                <a
                    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                    className="text-indigo-600 hover:underline"
                >
                    {LEGAL_CONTACT_EMAIL}
                </a>
                .
            </p>
        </LegalSection>
    </LegalDoc>
);
