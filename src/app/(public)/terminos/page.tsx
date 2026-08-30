import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones para usar la plataforma Universo Psi.",
};

const sectionClassName = "space-y-3";
const headingClassName = "text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl";
const listClassName = "list-disc space-y-2 pl-5 marker:text-senda";

export default function TermsPage() {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">
          Versión agosto de 2026
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
          Términos y condiciones
        </h1>
        <p className="mt-5 rounded-2xl border border-senda/25 bg-senda/5 px-5 py-4 text-sm leading-6 text-ink">
          <strong>Borrador sujeto a revisión legal.</strong> Este texto describe el funcionamiento actual de
          Universo Psi. Antes de habilitar contrataciones pagas deberá completarse la identificación legal de la
          persona responsable de la plataforma y revisar estas condiciones con asesoramiento profesional.
        </p>

        <div className="mt-9 space-y-9 text-[0.9375rem] leading-7 text-muted">
          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. Alcance y aceptación</h2>
            <p>
              Estos términos regulan el acceso y uso de Universo Psi, una plataforma digital para descubrir,
              comparar y contactar profesionales de salud mental. Al crear una cuenta o utilizar una función que exige aceptación,
              confirmás que leíste y aceptaste la versión vigente. Si no estás de acuerdo, no uses esas
              funciones.
            </p>
            <p>
              Algunas páginas pueden consultarse sin registro. Para contactar profesionales, publicar un
              perfil o acceder a funciones privadas podemos solicitar una cuenta y datos adicionales.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Qué hace Universo Psi</h2>
            <p>
              Universo Psi organiza información y facilita el primer contacto. No presta los servicios anunciados,
              no emplea ni representa a los profesionales, no actúa como agencia de empleo o selección y no es
              parte de los acuerdos que las personas celebren entre sí.
            </p>
            <p>
              La búsqueda y el orden de resultados son orientativos. Buscan acercar opciones relevantes según
              la información disponible, pero no diagnostican, prescriben ni garantizan compatibilidad, empleo,
              admisión educativa, ingresos u otro resultado. Ante una urgencia médica o de salud mental, usá los
              servicios de emergencia correspondientes: Universo Psi no es un canal de atención de urgencias.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>3. Cuentas y seguridad</h2>
            <p>
              Debés proporcionar datos verdaderos, completos y actualizados, usar una cuenta propia y proteger
              tus credenciales de acceso. Sos responsable de la actividad realizada desde tu cuenta, salvo que
              nos informes oportunamente un acceso no autorizado. No compartas contraseñas ni intentes acceder a
              cuentas, documentos o áreas que no te correspondan.
            </p>
            <p>
              Podemos pedir verificaciones razonables de identidad o autorización. La cuenta no puede utilizarse
              para suplantar a otra persona ni transferirse sin autorización de Universo Psi.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>4. Consultas y relación con profesionales</h2>
            <p>
              Cuando enviás una consulta, autorizás a Universo Psi a ponerla a disposición del profesional elegido
              para que pueda responder. El envío no obliga al profesional a aceptar la consulta ni crea por sí
              solo una relación profesional.
            </p>
            <p>
              Alcance, honorarios, modalidad, cancelaciones, confidencialidad y cualquier otra condición del
              acompañamiento se acuerdan directamente con el profesional. Evaluá si su experiencia, matrícula o
              habilitación —cuando corresponda— son adecuadas para tu necesidad.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>5. Perfiles, credenciales y publicación</h2>
            <p>
              Cada profesional es responsable por la exactitud, licitud y vigencia de su perfil, experiencia,
              disponibilidad, credenciales y servicios. También debe contar con los títulos, matrículas,
              permisos y seguros que exija su actividad, y mantenerlos actualizados.
            </p>
            <p>
              Una marca de verificación sólo indica que Universo Psi revisó la documentación prevista para esa
              categoría en un momento determinado. No certifica toda la trayectoria, no reemplaza controles de
              autoridades competentes y no constituye una garantía o recomendación absoluta. Los perfiles pueden
              permanecer en borrador o revisión hasta que se autorice su publicación.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Planes y pagos</h2>
            <p>
              Los planes profesionales se encuentran actualmente en estado de borrador y no tienen precios
              aprobados. Elegir un plan puede registrar una solicitud como pendiente de pago, pero no activa una
              suscripción, no genera deuda y no produce ningún cobro.
            </p>
            <p>
              Antes de habilitar pagos, Universo Psi deberá informar de manera clara el precio final, moneda,
              impuestos, prestaciones, renovación, cancelación y proveedor de pago aplicables, y solicitar la
              aceptación correspondiente. No ingreses datos de tarjeta mientras la plataforma informe que la
              integración no está configurada.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>7. Contenido piloto y convenios</h2>
            <p>
              Los perfiles, recursos, testimonios, necesidades y convenios identificados como “demo”, “piloto” o
              “ficticio” se muestran para evaluar la experiencia del producto. No representan personas, acuerdos,
              beneficios ni disponibilidad reales. Sólo un contenido publicado sin esa identificación y
              confirmado por la parte responsable puede presentarse como vigente.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>8. Usos prohibidos</h2>
            <p>No podés usar Universo Psi para:</p>
            <ul className={listClassName}>
              <li>infringir la ley, derechos de terceros o estas condiciones;</li>
              <li>publicar información falsa, engañosa, discriminatoria, abusiva, ilegal o sin autorización;</li>
              <li>acosar, amenazar, estafar, enviar spam o recolectar datos personales para fines no consentidos;</li>
              <li>extraer datos de forma automatizada, crear bases paralelas o reutilizar perfiles para marketing;</li>
              <li>eludir controles de acceso, probar vulnerabilidades sin permiso o interferir con el servicio;</li>
              <li>introducir malware, saturar la infraestructura o automatizar acciones de manera abusiva;</li>
              <li>manipular reseñas, métricas, resultados, verificaciones o la identidad de otra persona.</li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>9. Contenido aportado por usuarios</h2>
            <p>
              Conservás los derechos que tengas sobre el contenido que aportás. Declarás que podés publicarlo y
              que no vulnera derechos de terceros. Otorgás a Universo Psi una autorización no exclusiva, gratuita y
              limitada a alojar, reproducir, adaptar técnicamente y mostrar ese contenido sólo en la medida
              necesaria para operar, proteger y comunicar la plataforma.
            </p>
            <p>
              Podemos revisar, solicitar correcciones, limitar la visibilidad o retirar contenido que infrinja
              estas condiciones, la ley, derechos de terceros o los criterios de calidad y seguridad publicados.
              La moderación no convierte a Universo Psi en autora ni garante del contenido ajeno.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>10. Propiedad intelectual</h2>
            <p>
              La marca, identidad visual, software, diseño, textos propios, taxonomías y demás materiales creados
              para Universo Psi están protegidos por las normas aplicables. Podés usar la plataforma para fines
              personales o profesionales legítimos dentro de sus funciones. No podés copiar, vender, publicar,
              modificar, descompilar ni explotar esos materiales fuera de ese permiso, salvo autorización o
              habilitación legal expresa.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>11. Privacidad y comunicaciones</h2>
            <p>
              El tratamiento de datos personales se explica por separado en la{" "}
              <Link className="font-semibold text-ink underline underline-offset-4" href="/privacidad">
                Política de privacidad
              </Link>
              . Esa política informa qué datos se usan, para qué finalidades, con quién pueden compartirse y cómo
              ejercer los derechos correspondientes. No publiques datos sensibles o confidenciales en campos
              públicos.
            </p>
            <p>
              Podemos enviar comunicaciones necesarias para seguridad, acceso, consultas, moderación o cambios
              del servicio. Las comunicaciones promocionales, si se habilitan, requerirán la base legal y las
              opciones de baja que correspondan.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>12. Servicios y enlaces de terceros</h2>
            <p>
              La plataforma puede depender de proveedores tecnológicos o incluir enlaces a sitios de terceros.
              Cada tercero aplica sus propias condiciones y políticas. Universo Psi no controla sus contenidos ni
              responde por decisiones tomadas fuera de la plataforma, sin perjuicio de las obligaciones que la
              ley imponga respecto de proveedores contratados para operar el servicio.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>13. Moderación, suspensión y baja</h2>
            <p>
              Podemos advertir, limitar, suspender o cerrar cuentas; despublicar perfiles; y preservar evidencia
              cuando existan indicios razonables de fraude, riesgo, incumplimiento, orden de autoridad o necesidad
              de proteger a otras personas y a la plataforma. Siempre que sea posible, comunicaremos el motivo y
              ofreceremos un canal de revisión.
            </p>
            <p>
              Podés dejar de usar Universo Psi y solicitar el cierre de tu cuenta mediante los canales que la
              plataforma habilite. La baja se procesa de acuerdo con la Política de privacidad y no elimina
              información que deba conservarse por obligación legal, seguridad o defensa de derechos.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>14. Disponibilidad y cambios del servicio</h2>
            <p>
              Trabajamos para mantener Universo Psi disponible y segura, pero puede haber interrupciones por
              mantenimiento, fallas, incidentes o causas ajenas. Podemos modificar o discontinuar funciones y
              contenidos. Si un cambio afecta sustancialmente un servicio contratado, se aplicarán la información
              previa, las opciones de cancelación y los reintegros que correspondan según la ley y las condiciones
              particulares vigentes.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>15. Responsabilidad</h2>
            <p>
              Las decisiones profesionales, laborales o educativas se toman bajo responsabilidad de las personas
              involucradas. Universo Psi no garantiza la identidad más allá de los controles informados, la calidad o
              disponibilidad de servicios de terceros ni un resultado específico. Cada profesional responde por
              su actividad, sus declaraciones y el cumplimiento de sus obligaciones.
            </p>
            <p>
              Nada de estos términos excluye responsabilidades que no puedan limitarse legalmente ni restringe
              derechos irrenunciables de consumidores y usuarios. Universo Psi responderá en la medida establecida
              por la normativa argentina aplicable.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>16. Ley aplicable</h2>
            <p>
              Estos términos se interpretan conforme a las leyes de la República Argentina. Cualquier mecanismo
              de consulta, mediación o resolución de conflictos deberá respetar la jurisdicción y los derechos que
              resulten obligatorios para cada persona, en especial la normativa de defensa del consumidor y de
              protección de datos personales. Este borrador no fija una jurisdicción exclusiva.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>17. Cambios y contacto</h2>
            <p>
              Podemos actualizar estos términos para reflejar cambios legales, operativos o del producto. La fecha
              y versión vigentes se mostrarán al inicio; si el cambio es sustancial, lo informaremos y pediremos
              una nueva aceptación cuando corresponda.
            </p>
            <p>
              Las consultas, reportes y solicitudes legales podrán presentarse por los canales de contacto que
              Universo Psi publique en la plataforma. La versión definitiva deberá incluir un canal electrónico estable
              y la identificación legal completa de su responsable antes de habilitar servicios pagos.
            </p>
          </section>
        </div>
      </Container>
    </section>
  );
}
