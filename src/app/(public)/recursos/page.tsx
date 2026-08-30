import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { ResourceCard } from "@/components/public/resource-card";
import { SectionHeading } from "@/components/public/section-heading";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";

export const metadata: Metadata = {
  title: "Recursos para pensar tu trayectoria",
  description: "Ideas y herramientas escritas por profesionales para explorar decisiones, búsquedas y transiciones de estudio, trabajo y carrera.",
  alternates: { canonical: "/recursos" },
};

export default async function ResourcesPage() {
  const resources = await publicRepository.listResources();
  const [featured, ...rest] = resources;

  return (
    <>
      <PageHero
        eyebrow="Recursos"
        title="Ideas para pensar mejor antes de moverte más rápido."
        description="Perspectivas y herramientas escritas por quienes acompañan decisiones profesionales. Contenido revisado, preguntas concretas y ningún atajo universal."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Recursos" }]}
        aside={<p className="rounded-[1.25rem] border border-line bg-paper p-5 text-sm leading-6 text-muted"><strong className="block text-ink">Criterio editorial</strong>Cada recurso se revisa antes de publicarse. Las ideas informan y orientan; no reemplazan acompañamiento profesional ni atención de salud.</p>}
      />

      <section className="bg-canvas py-14 sm:py-18 lg:py-20">
        <Container>
          {featured ? <ResourceCard article={featured} featured /> : null}
          <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Biblioteca" title="Preguntas que abren caminos." />
            <Link href="/profesionales" className={buttonStyles({ variant: "secondary" })}>Buscar profesionales</Link>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => <ResourceCard key={article.slug} article={article} />)}
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-paper py-14 sm:py-18">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Escribir en Universo Psi</p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.035em] text-ink">¿Sos profesional de la red y tenés una idea que puede ayudar?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Nuestro proceso editorial cuida la claridad, la evidencia y la utilidad para cada etapa de la trayectoria.</p>
            </div>
            <Link href="/para-profesionales" className={buttonStyles({ variant: "secondary" })}>Conocer la propuesta</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
