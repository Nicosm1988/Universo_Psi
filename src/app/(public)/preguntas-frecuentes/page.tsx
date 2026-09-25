import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { Container } from "@/components/ui/container";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas sobre registro, planes, pagos, verificación de matrículas, datos personales y responsabilidad en Universo Psi.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

type QuestionGroup = {
  id: string;
  title: string;
  intro: string;
  questions: Array<{ question: string; answer: string }>;
};

const groups: QuestionGroup[] = [
  {
    id: "profesionales",
    title: "Para profesionales de la salud mental y similares",
    intro: "Registro, planes de suscripción, cobros, verificación y baja del perfil.",
    questions: [
      {
        question: "¿Cómo me registro y publico mi perfil en Universo Psi?",
        answer:
          "Es muy sencillo. Solo tenés que ingresar a universopsi.com.ar y crear tu cuenta. Podés hacerlo completando el formulario con tu correo electrónico y una contraseña segura, o agilizar el proceso autenticándote directamente con tu cuenta de Google. Una vez adentro, podrás armar tu perfil profesional especificando tus enfoques teóricos, modalidades de atención y datos de contacto.",
      },
      {
        question: "¿Qué son los planes de suscripción y cuándo vencen?",
        answer:
          "Para figurar en el catálogo profesional de la plataforma y recibir solicitudes de consultas, es necesario contratar un plan de suscripción. El cobro de este abono se realiza en forma periódica y mensual. El vencimiento para el pago de tu plan opera el día 5 (cinco) de cada mes.",
      },
      {
        question: "¿Qué pasa si no abono mi suscripción antes del día 5?",
        answer:
          "Si al llegar el día 5 de cada mes el pago de tu plan no se encuentra acreditado, el sistema suspenderá automáticamente la visibilidad de tu cuenta y tu perfil será retirado temporalmente de los resultados del buscador. Una vez que regularices el saldo, tu perfil volverá a figurar en el catálogo de inmediato.",
      },
      {
        question: "¿Cómo se procesan los pagos y qué datos guardan de mi tarjeta?",
        answer:
          "Todos los pagos se procesan de forma exclusiva y segura a través de la pasarela externa de Mercado Pago. Por tu seguridad y privacidad, Universo Psi no solicita, no recopila ni almacena en sus servidores ningún dato sensible de tus tarjetas de crédito o débito. Toda la transacción financiera ocurre bajo el entorno cifrado de Mercado Pago.",
      },
      {
        question: "¿Por qué mi perfil tiene (o no tiene) un logo de certificación o validación?",
        answer:
          "Para promover la transparencia y la confianza en la comunidad, Universo Psi solicita de forma obligatoria a los profesionales una copia de su documentación respaldatoria (como títulos habilitantes o matrículas profesionales). Una vez que nuestro equipo realiza un control formal de la documentación aportada, se asigna el logo de certificación o validación en el perfil. Recordá que la veracidad de dichos documentos sigue siendo responsabilidad exclusiva de quien los aporta.",
      },
      {
        question: "¿Cómo doy de baja mi plan de suscripción voluntariamente?",
        answer:
          "Si por cualquier motivo decidís no continuar en la plataforma o querés dejar de recibir nuestras comunicaciones, podés solicitar la baja definitiva de tu cuenta y la supresión de tus datos en cualquier momento. Solo tenés que completar el formulario de baja, arrepentimiento y privacidad disponible en el sitio web, que te deja una constancia del pedido. La baja de los datos implicará la cancelación inmediata de la visibilidad de tu perfil.",
      },
      {
        question: "¿Cómo funciona la aplicación móvil para profesionales?",
        answer:
          "La app (disponible para Android e iOS) es de uso exclusivo e interno para los profesionales registrados. No contiene publicidad externa. Sirve únicamente para que puedas recibir de forma más cómoda, rápida y directa en tu celular las notificaciones push sobre solicitudes de tratamientos y consultas que los usuarios realizan originalmente en el sitio web. Se ingresa con el mismo usuario y contraseña que creaste en la web.",
      },
    ],
  },
  {
    id: "usuarios",
    title: "Para usuarios y visitantes",
    intro: "Qué cuesta buscar, qué datos se piden y de qué responde la plataforma.",
    questions: [
      {
        question: "¿Tengo que pagar algún canon o registrarme para buscar un profesional?",
        answer:
          "No, para nada. El acceso, la navegación y las búsquedas dentro del catálogo de Universo Psi son 100 % libres y gratuitos para toda la comunidad. No necesitás registrarte ni crear ninguna cuenta para buscar un terapeuta, psicólogo o especialista en rehabilitación, ni para escribirle. Si querés, podés crear una cuenta gratuita y opcional para tener juntas las consultas que enviaste y seguir su estado; no cambia el precio ni te da prioridad.",
      },
      {
        question: "¿Para qué sirve crear una cuenta si no es obligatoria?",
        answer:
          "Sólo para tu comodidad. Con una cuenta, las consultas que enviás quedan reunidas en tu espacio y podés ver si el profesional ya las leyó o te respondió. Sin cuenta, la consulta se envía igual y llega igual: el profesional la recibe de la misma manera. Podés pedir la baja de la cuenta cuando quieras desde el formulario de baja, arrepentimiento y privacidad.",
      },
      {
        question: "¿Qué datos me solicitan si decido contactar a un profesional?",
        answer:
          "Si encontrás un especialista que se adapte a tus necesidades y decidís enviarle una solicitud de contacto a través de la plataforma, el sistema solo te pedirá tu nombre completo y un correo electrónico válido. Estos datos se solicitan con el único fin de identificar tu solicitud de tratamiento y permitir que los datos de contacto lleguen correctamente a tu casilla de correo.",
      },
      {
        question: "¿Universo Psi almacena mi historia clínica, diagnósticos o motivos de consulta?",
        answer:
          "No, bajo ninguna circunstancia. Cumpliendo estrictamente con la Ley N° 25.326 de Protección de Datos Personales, Universo Psi tiene prohibido recolectar o almacenar datos sensibles de salud. La plataforma funciona únicamente como un puente de intermediación digital neutral para que encuentres al profesional que buscás. Todo lo que converses, tus diagnósticos, tratamientos o historias clínicas forman parte del secreto profesional directo entre vos y el profesional, y ocurren completamente por fuera de Universo Psi.",
      },
      {
        question: "¿La plataforma se hace responsable por los tratamientos o diagnósticos de los profesionales?",
        answer:
          "No. Universo Psi funciona como una guía de difusión e intermediación digital neutral. Aunque realizamos un control formal de la documentación técnica y matrículas de los perfiles certificados, Universo Psi declina cualquier tipo de responsabilidad civil, penal o ética por los servicios, opiniones, diagnósticos o tratamientos que los profesionales brinden en sus consultorios o de forma externa, como así también de la validez y veracidad de sus títulos y la vigencia de su matrícula profesional. La relación clínica es de exclusiva responsabilidad entre el paciente y el profesional elegido.",
      },
      {
        question: "¿Qué hago si detecto un perfil falso o un comentario ofensivo?",
        answer: `Si detectás que un perfil cuenta con datos falsos o identificás valoraciones y comentarios que resulten ofensivos, discriminatorios o difamatorios, podés reportarlo de inmediato enviándonos un mensaje a través de nuestro formulario de “Contacto” o escribirnos a ${LEGAL_CONTACT_EMAIL}. Universo Psi investigará el reporte de buena fe y se reserva el derecho de dar de baja o suprimir cualquier contenido que viole e incumpla nuestros términos y condiciones.`,
      },
    ],
  },
];

export default async function FaqPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.questions.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    ),
  };

  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container className="max-w-3xl">
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">Ayuda</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Preguntas frecuentes</h1>
        <p className="mt-5 text-[0.9375rem] leading-7 text-muted">
          Si no encontrás lo que buscás, escribinos por el{" "}
          <Link className="font-semibold text-ink underline underline-offset-4" href="/contacto">
            formulario de contacto
          </Link>
          .
        </p>

        <nav aria-label="Secciones de preguntas frecuentes" className="mt-8">
          <ul className="flex flex-wrap gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                <a
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 motion-reduce:transition-none"
                  href={`#${group.id}`}
                >
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 space-y-14">
          {groups.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{group.intro}</p>
              <ul className="mt-6 space-y-3">
                {group.questions.map(({ question, answer }) => (
                  <li key={question}>
                    <details className="group rounded-2xl border border-line bg-canvas px-5 py-4 open:border-line-strong">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[0.9375rem] font-semibold leading-6 text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35">
                        {question}
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-xl leading-none text-senda transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-[0.9375rem] leading-7 text-muted">{answer}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-senda/25 bg-senda/5 px-5 py-4 text-sm leading-6 text-ink">
          Las condiciones completas están en los{" "}
          <Link className="font-semibold underline underline-offset-4" href="/terminos">
            términos y condiciones
          </Link>{" "}
          y en la{" "}
          <Link className="font-semibold underline underline-offset-4" href="/privacidad">
            política de privacidad
          </Link>
          . Ante una urgencia de salud mental, comunicate con los servicios de emergencia de tu localidad: Universo
          Psi no es un canal de atención de urgencias.
        </div>
      </Container>
    </section>
  );
}
