import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";
import { formatPlanPrice } from "@/lib/demo/public-data";

export const metadata: Metadata = {
  title: "Planes para profesionales",
  description: "Elegí el nivel de presencia, contenidos y analítica que acompaña la etapa actual de tu práctica profesional.",
  alternates: { canonical: "/planes" },
};

export default async function PlansPage() {
  const plans = await publicRepository.listPlans();

  return (
    <>
      <PageHero
        eyebrow="Planes para profesionales"
        title="Una suscripción clara, sin promesas de contactos garantizados."
        description="Compará el nivel de herramientas y participación que acompaña tu práctica actual. La selección inicial no activa cobros ni una suscripción paga."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Para profesionales", href: "/para-profesionales" }, { label: "Planes" }]}
        aside={<p className="rounded-[1.25rem] border border-line bg-paper p-5 text-sm leading-6 text-muted"><strong className="block text-ink">Condiciones en definición</strong>Los importes, impuestos y términos comerciales se informarán antes de habilitar cualquier contratación.</p>}
      />

      <section className="bg-canvas py-14 sm:py-18 lg:py-20">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
            {plans.map((plan) => (
              <article key={plan.slug} className={`relative rounded-[1.6rem] border bg-paper p-6 sm:p-7 ${plan.featured ? "border-senda shadow-soft lg:-mt-4 lg:pb-10 lg:pt-8" : "border-line"}`}>
                {plan.badge ? <Badge tone="senda">{plan.badge}</Badge> : <span className="block h-6" />}
                <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">{plan.name}</h2>
                <p className="mt-3 min-h-18 text-sm leading-6 text-muted">{plan.description}</p>
                <p className="mt-7 border-y border-line py-5">
                  <span className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink">{formatPlanPrice(plan)}</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-5 text-muted">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-3"><span aria-hidden="true" className="font-bold text-senda-dark">✓</span>{feature}</li>)}
                </ul>
                <Link href={`/profesionales/sumarse?plan=${plan.slug.toUpperCase()}` as Route} className={`${buttonStyles({ variant: plan.featured ? "primary" : "secondary" })} mt-8 w-full`}>
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-muted">La prioridad de visibilidad es moderada, siempre identificada y nunca reemplaza la pertinencia temática. Ningún plan garantiza una cantidad de contactos.</p>
        </Container>
      </section>

      <section className="bg-paper py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-senda-dark">Preguntas frecuentes</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-ink">Antes de elegir un plan.</h2>
              <Link href="/para-profesionales" className={`${buttonStyles({ variant: "secondary" })} mt-7`}>Conocer la propuesta completa</Link>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {[
                ["¿El plan garantiza consultas?", "No. La demanda depende de cada especialidad, momento y encaje. La plataforma mejora la posibilidad de ser encontrado y ofrece información para comprender el rendimiento."],
                ["¿Puedo publicar mi perfil sin verificación?", "Podés prepararlo y enviarlo a revisión. Sólo se publica cuando cumple los requisitos definidos para tu tipo profesional."],
                ["¿Cómo se identifica un perfil destacado?", "Con una etiqueta visible en la tarjeta y el perfil. La verificación, las opiniones y el encaje permanecen como señales independientes."],
                ["¿Puedo cambiar de plan?", "La arquitectura contempla cambios y cancelación por período. Esa operación se habilitará junto con los términos comerciales y la integración de cobro."],
              ].map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-semibold text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/25"><span>{question}</span><span aria-hidden="true" className="text-xl font-normal text-senda-dark group-open:rotate-45">+</span></summary>
                  <p className="max-w-2xl pb-3 pr-10 text-sm leading-6 text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
