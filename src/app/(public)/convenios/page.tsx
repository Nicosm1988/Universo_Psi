import type { Metadata } from "next";
import { AgreementCard } from "@/components/public/agreement-card";
import { PageHero } from "@/components/public/page-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";

export const metadata: Metadata = {
  title: "Convenios para organizaciones y comunidades",
  description: "Programas de orientación, empleabilidad y desarrollo profesional para empresas, universidades, asociaciones y comunidades.",
  alternates: { canonical: "/convenios" },
};

export default async function AgreementsPage() {
  const agreements = await publicRepository.listAgreements();

  return (
    <>
      <PageHero
        eyebrow="Convenios"
        title="Acompañamiento profesional que llega a comunidades completas."
        description="Diseñamos accesos claros a orientación, empleabilidad, carrera y mentoría para estudiantes, equipos, personas asociadas y comunidades."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Convenios" }]}
        actions={<span className="inline-flex min-h-12 items-center rounded-full border border-line bg-paper px-6 text-sm font-semibold text-muted">Canal institucional en preparación</span>}
        aside={<div className="rounded-[1.35rem] border border-line bg-paper p-5 text-sm leading-6 text-muted"><strong className="block text-ink">Privacidad desde el diseño</strong>Las instituciones reciben métricas agregadas. Nunca compartimos motivos de consulta ni información personal sin una base legítima y transparente.</div>}
      />

      <section className="bg-canvas py-14 sm:py-18 lg:py-20">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">{agreements.map((agreement) => <AgreementCard key={agreement.slug} agreement={agreement} />)}</div>
        </Container>
      </section>

      <section className="bg-paper py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading eyebrow="Diseño de programas" title="Un convenio no es sólo un descuento." description="Cada programa define a quién alcanza, qué servicios incluye, cómo se accede y qué información puede recibir la organización." align="center" />
          <ol className="mx-auto mt-12 grid max-w-5xl gap-7 md:grid-cols-3">
            {[
              ["01", "Comprender", "Acordamos objetivos, población, necesidades, cobertura y criterios de éxito."],
              ["02", "Configurar", "Seleccionamos servicios y profesionales; definimos cupos, condiciones y circuito de acceso."],
              ["03", "Aprender", "Seguimos uso y calidad con indicadores agregados, sin invadir la privacidad de las consultas."],
            ].map(([number, title, description]) => <li key={number} className="border-t border-line-strong pt-6"><span className="font-display text-4xl font-semibold text-clay">{number}</span><h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h2><p className="mt-3 text-sm leading-6 text-muted">{description}</p></li>)}
          </ol>
        </Container>
      </section>

      <section className="bg-senda-dark py-16 text-white sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-sand">Organizaciones</p><h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-balance">Conversemos sobre el momento de tu comunidad.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-white/68">Empresas, universidades, asociaciones, mutuales y programas de transición pueden solicitar una propuesta a medida.</p></div>
            <span className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white/75">Contacto institucional próximamente</span>
          </div>
        </Container>
      </section>
    </>
  );
}
