import { LegalDoc, LegalSection } from "../components/LegalDoc";
import { LEGAL_CONTACT_EMAIL } from "../constants";

export const PrivacyPage = () => (
    <LegalDoc
        title="Política de Privacidad"
        intro="Esta política explica qué datos recopila EduNotas, para qué los usa y cómo podés ejercer tus derechos. Se complementa con los Términos y Condiciones."
    >
        <LegalSection heading="1. Responsable">
            <p>
                EduNotas es una aplicación académica. El responsable del
                tratamiento es el equipo del proyecto, con contacto en{" "}
                <a
                    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                    className="text-indigo-600 hover:underline"
                >
                    {LEGAL_CONTACT_EMAIL}
                </a>
                .
            </p>
        </LegalSection>

        <LegalSection heading="2. Datos que recopilamos">
            <ul className="list-disc space-y-1 pl-5">
                <li>
                    <strong>Datos de cuenta:</strong> nombre de usuario, nombre,
                    apellido y correo electrónico.
                </li>
                <li>
                    <strong>Datos académicos:</strong> cursos, secciones,
                    equipos, matrículas, tareas y calificaciones.
                </li>
                <li>
                    <strong>Registros de actividad:</strong> acciones relevantes
                    (inicios de sesión, impersonaciones, cambios de cursos,
                    equipos y notas) con autor, acción y fecha.
                </li>
                <li>
                    <strong>Registros técnicos:</strong> errores de la aplicación
                    (sin el cuerpo de las peticiones) y datos básicos de la
                    sesión.
                </li>
            </ul>
        </LegalSection>

        <LegalSection heading="3. Para qué los usamos">
            <p>
                Usamos los datos para operar la plataforma: autenticarte,
                gestionar inscripciones, calcular y mostrar calificaciones,
                enviarte correos de activación y recuperación de contraseña,
                notificarte eventos y mantener la seguridad y la auditoría del
                sistema.
            </p>
        </LegalSection>

        <LegalSection heading="4. Cookies y almacenamiento">
            <p>
                Usamos solo cookies técnicas necesarias para la autenticación:
                una cookie <code>refresh_token</code> (HttpOnly) y una cookie
                <code> csrftoken</code> de protección contra CSRF. No usamos
                cookies de publicidad ni de seguimiento, por lo que no hace falta
                un aviso de consentimiento de cookies.
            </p>
        </LegalSection>

        <LegalSection heading="5. Conservación">
            <p>
                Conservamos los datos mientras tu cuenta esté activa. Algunos
                registros se depuran de forma periódica: las notificaciones
                leídas con más de 30 días y los eventos de inicio de sesión con
                más de 30 días se eliminan automáticamente. Los historiales de
                calificaciones y los resúmenes de secciones eliminadas se
                conservan por su valor académico.
            </p>
        </LegalSection>

        <LegalSection heading="6. Compartición con terceros">
            <p>
                No vendemos tus datos. Para enviar correos usamos un proveedor
                de correo transaccional (Brevo o Gmail), que recibe únicamente la
                dirección y el contenido del mensaje.
            </p>
        </LegalSection>

        <LegalSection heading="7. Tus derechos">
            <p>
                Podés acceder y actualizar tus datos desde la configuración de tu
                perfil. Para solicitar la eliminación de tu cuenta o de tus datos,
                escribí a{" "}
                <a
                    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                    className="text-indigo-600 hover:underline"
                >
                    {LEGAL_CONTACT_EMAIL}
                </a>{" "}
                o contactá a un administrador, que puede desactivar la cuenta.
            </p>
        </LegalSection>

        <LegalSection heading="8. Menores">
            <p>
                Si la plataforma se usa con estudiantes menores de edad, la
                institución educativa es responsable de contar con las
                autorizaciones correspondientes.
            </p>
        </LegalSection>

        <LegalSection heading="9. Cambios">
            <p>
                Si modificamos esta política, actualizaremos la versión y se te
                pedirá que aceptes los términos vigentes al iniciar sesión. La
                versión actual se muestra al comienzo de este documento.
            </p>
        </LegalSection>
    </LegalDoc>
);
