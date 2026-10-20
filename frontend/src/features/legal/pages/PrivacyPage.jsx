import { LegalDoc, LegalSection } from "../components/LegalDoc";
import { LEGAL_CONTACT_EMAIL } from "../constants";

export const PrivacyPage = () => (
    <LegalDoc
        title="Política de Privacidad"
        intro="Esta política explica qué datos tratamos en EduNotas, para qué los usamos y cómo podés ejercer tus derechos. Se complementa con los Términos y Condiciones."
    >
        <LegalSection heading="1. Responsable y contacto">
            <p>
                EduNotas es una aplicación académica desarrollada como proyecto
                del equipo. El responsable del tratamiento es el equipo del
                proyecto, con contacto en{" "}
                <a
                    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                    className="text-indigo-600 hover:underline"
                >
                    {LEGAL_CONTACT_EMAIL}
                </a>
                .
            </p>
        </LegalSection>

        <LegalSection heading="2. Datos que tratamos">
            <ul className="list-disc space-y-1 pl-5">
                <li>
                    <strong>Datos de cuenta:</strong> los necesarios para
                    identificarte y darte acceso.
                </li>
                <li>
                    <strong>Datos académicos:</strong> cursos, secciones,
                    equipos, matrículas, tareas, calificaciones e historial de
                    cambios de notas.
                </li>
                <li>
                    <strong>Registros de actividad:</strong> acciones relevantes
                    (inicios de sesión, impersonaciones, cambios de cursos,
                    equipos y notas) con autor, acción y fecha.
                </li>
                <li>
                    <strong>Registros técnicos:</strong> errores de la aplicación
                    (mensaje y traza técnica). No guardamos el cuerpo de las
                    peticiones.
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

        <LegalSection heading="4. Cookies y almacenamiento del navegador">
            <p>
                Usamos solo cookies técnicas necesarias para la autenticación:
                una cookie <code>refresh_token</code> (HttpOnly) y una cookie{" "}
                <code>csrftoken</code> de protección contra CSRF. El token de
                acceso se mantiene solo en memoria. No usamos cookies de
                publicidad ni de seguimiento, por lo que no hace falta un aviso
                de consentimiento de cookies.
            </p>
        </LegalSection>

        <LegalSection heading="5. Proveedores y transferencias">
            <p>
                No vendemos tus datos. El servicio se aloja en infraestructura de
                Render, que también aloja la base de datos, y usamos un proveedor
                de correo transaccional (Brevo o Gmail) que recibe únicamente la
                dirección y el contenido del mensaje.
            </p>
            <p>
                Algunos de estos proveedores pueden estar ubicados fuera de
                Nicaragua, por lo que tus datos pueden procesarse en otros países.
            </p>
        </LegalSection>

        <LegalSection heading="6. Conservación">
            <p>
                Conservamos los datos mientras tu cuenta esté activa. Las
                notificaciones leídas y los eventos de inicio de sesión se
                depuran cuando superan los 30 días. Los historiales de
                calificaciones y los resúmenes de secciones o cursos eliminados
                se conservan por su valor académico. Las copias de seguridad las
                gestiona el proveedor de alojamiento.
            </p>
        </LegalSection>

        <LegalSection heading="7. Eliminación y desactivación">
            <p>
                No ofrecemos el borrado automático de cuentas. Podés solicitar la
                desactivación de tu cuenta, y un administrador puede
                desactivarla. De forma excepcional y manual, un administrador
                puede eliminar una cuenta, lo que también elimina sus registros
                académicos.
            </p>
        </LegalSection>

        <LegalSection heading="8. Tus derechos">
            <p>
                Podés acceder y actualizar tus datos desde la configuración de tu
                perfil y solicitar la desactivación de tu cuenta escribiendo a{" "}
                <a
                    href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                    className="text-indigo-600 hover:underline"
                >
                    {LEGAL_CONTACT_EMAIL}
                </a>
                . Atendemos las solicitudes en un plazo razonable.
            </p>
        </LegalSection>

        <LegalSection heading="9. Menores">
            <p>
                Si la plataforma se usa con estudiantes menores de edad, la
                institución educativa es responsable de contar con las
                autorizaciones correspondientes.
            </p>
        </LegalSection>

        <LegalSection heading="10. Seguridad">
            <p>
                Aplicamos medidas técnicas y organizativas para proteger la
                información: conexiones cifradas (HTTPS), cookies de sesión
                HttpOnly y Secure en producción, control de acceso por roles y
                registros de actividad. Ningún sistema es completamente seguro.
            </p>
        </LegalSection>

        <LegalSection heading="11. Cambios">
            <p>
                Si modificamos esta política, actualizaremos la versión y se te
                pedirá que aceptes los términos vigentes al iniciar sesión. La
                versión actual y la fecha de última actualización se muestran al
                comienzo de este documento.
            </p>
        </LegalSection>
    </LegalDoc>
);
