import type { Metadata } from "next";
import Link from "next/link";

import { SupportForm } from "@/components/public/support-form";
import { Container } from "@/components/ui/container";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Canal oficial de Universo Psi para ejercer derechos sobre tus datos, solicitar la baja, reportar un perfil o pedir ayuda.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container className="max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">Contacto</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
            Escribinos y te respondemos
          </h1>
          <p className="mt-5 text-[0.9375rem] leading-7 text-muted">
            Escribinos para reportar un perfil o un contenido, avisar un problema de seguridad, pedir ayuda con la
            plataforma o hacer una consulta comercial.
          </p>
          <div className="mt-5 rounded-2xl border border-senda/25 bg-senda/5 px-5 py-4 text-sm leading-6 text-ink">
            <strong className="font-semibold">¿Venís por tus datos, una baja o un arrepentimiento?</strong> Eso se
            gestiona en el{" "}
            <Link className="font-semibold underline underline-offset-4" href="/solicitudes">
              formulario de baja, arrepentimiento y privacidad
            </Link>
            , que te entrega una constancia y no te pide crear una cuenta. Usá ese canal para acceso,
            rectificación, actualización y supresión de datos, baja de cuenta o plan, y reclamos.
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div className="rounded-[1.5rem] border border-line bg-canvas p-6 sm:p-8">
            <SupportForm defaultTopic={motivo} />
          </div>

          <aside className="space-y-6 text-[0.9375rem] leading-7 text-muted">
            <div className="rounded-2xl border border-clay/25 bg-clay-soft px-5 py-4 text-sm leading-6 text-clay-dark">
              <strong className="font-semibold">Universo Psi no atiende urgencias.</strong> Ante un riesgo
              inmediato para tu salud o la de otra persona, comunicate con los servicios de emergencia de tu
              localidad.
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">Otro canal</h2>
              <p className="mt-2">
                También podés escribirnos a{" "}
                <a
                  className="font-semibold text-ink underline underline-offset-4"
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">No incluyas datos sensibles</h2>
              <p className="mt-2">
                No cargues historias clínicas, diagnósticos, medicación ni información de salud, propia o de
                terceros. La plataforma tiene prohibido tratar esos datos y los elimina cuando los detecta.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">Vulnerabilidades</h2>
              <p className="mt-2">
                Si encontraste un fallo de seguridad, avisanos por acá antes de difundirlo o explotarlo, como pide
                la cláusula 3.n de los{" "}
                <Link className="font-semibold text-ink underline underline-offset-4" href="/terminos">
                  términos y condiciones
                </Link>
                . Incluí los pasos para reproducirlo y no accedas a datos de terceros.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">¿Buscás a un profesional?</h2>
              <p className="mt-2">
                Para consultar por un tratamiento, escribile directamente desde su perfil en el{" "}
                <Link className="font-semibold text-ink underline underline-offset-4" href="/profesionales">
                  catálogo de profesionales
                </Link>
                . Este formulario llega al equipo de la plataforma, no a un profesional.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">Antes de escribir</h2>
              <p className="mt-2">
                Muchas dudas sobre registro, planes, pagos y verificación están respondidas en las{" "}
                <Link
                  className="font-semibold text-ink underline underline-offset-4"
                  href="/preguntas-frecuentes"
                >
                  preguntas frecuentes
                </Link>
                .
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink">Órgano de control</h2>
              <p className="mt-2">
                Si considerás que tus datos personales no fueron tratados correctamente, podés reclamar ante la
                Agencia de Acceso a la Información Pública (AAIP):{" "}
                <a
                  className="font-semibold text-ink underline underline-offset-4"
                  href="https://www.argentina.gob.ar/aaip"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  www.argentina.gob.ar/aaip
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
