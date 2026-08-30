import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { AnalyticsPageView } from "@/components/analytics/page-view";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ProfessionalCard } from "@/components/public/professional-card";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";

type AgreementPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return publicRepository.listAgreementSlugs();
}

export async function generateMetadata({ params }: AgreementPageProps): Promise<Metadata> {
  const { slug } = await params;
  const agreement = await publicRepository.getAgreement(slug);
  if (!agreement) return { title: "Convenio no encontrado" };
  return {
    title: `${agreement.title} · ${agreement.institution}`,
    description: agreement.excerpt,
    alternates: { canonical: `/convenios/${agreement.slug}` },
  };
}

export default async function AgreementDetailPage({ params }: AgreementPageProps) {
  const { slug } = await params;
  const agreement = await publicRepository.getAgreement(slug);
  if (!agreement) notFound();
  const allProfessionals = await publicRepository.listProfessionals();
  const professionals = allProfessionals.filter((professional) => professional.agreementSlugs.includes(agreement.slug)).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: agreement.title,
    description: agreement.excerpt,
    provider: { "@type": "Organization", name: "Universo Psi" },
    audience: { "@type": "Audience", audienceType: agreement.audience },
    areaServed: agreement.coverage,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AnalyticsPageView eventName="agreement_viewed" />
      <section className="bg-ink py-10 text-white sm:py-14 lg:py-18">
        <Container>
          <Breadcrumbs inverse items={[{ label: "Inicio", href: "/" }, { label: "Convenios", href: "/convenios" }, { label: agreement.institution }]} />
          <div className="mt-9 grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                {agreement.isDemo === false ? null : <Badge tone="clay">Convenio ficticio de demostración</Badge>}
                <Badge>{agreement.kind}</Badge>
              </div>
              <p className="mt-5 text-sm font-semibold text-sand">{agreement.institution}</p>
              <h1 className="mt-3 max-w-[58rem] font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance">{agreement.title}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{agreement.excerpt}</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/14 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-sand">Vigencia</p>
              <p className="mt-2 text-sm leading-6 text-white/75">{agreement.validity}</p>
              {agreement.isDemo === false ? (
                <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/75">El canal de acceso se informa en las condiciones vigentes.</p>
              ) : (
                <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/75">Ejemplo sin acceso ni validez comercial.</p>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-paper py-14 sm:py-18 lg:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
            <div>
              <section aria-labelledby="incluye">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Alcance</p>
                <h2 id="incluye" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">Qué incluye el convenio</h2>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {agreement.services.map((service) => <div key={service} className="rounded-[1.15rem] border border-line bg-canvas p-5 text-sm font-semibold text-ink">{service}</div>)}
                </div>
              </section>

              <section aria-labelledby="acceso" className="mt-12 border-t border-line pt-12">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Paso a paso</p>
                <h2 id="acceso" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">Cómo acceder</h2>
                <ol className="mt-7 grid gap-4">
                  {agreement.access.map((item, index) => <li key={item} className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-[1.15rem] bg-canvas p-5"><span className="font-display text-2xl font-semibold text-clay">{index + 1}</span><p className="text-sm leading-6 text-muted">{item}</p></li>)}
                </ol>
              </section>

              <section aria-labelledby="condiciones" className="mt-12 border-t border-line pt-12">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Transparencia</p>
                <h2 id="condiciones" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">Condiciones de participación</h2>
                <ul className="mt-7 space-y-3 text-sm leading-6 text-muted">{agreement.eligibility.map((item) => <li key={item} className="flex gap-3 border-b border-line pb-3"><span aria-hidden="true" className="text-senda-dark">✓</span>{item}</li>)}</ul>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start" aria-label="Resumen del convenio">
              <div className="rounded-[1.35rem] border border-line bg-canvas p-6">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em] text-ink">A quién está dirigido</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{agreement.audience}</p>
                <dl className="mt-5 space-y-4 border-t border-line pt-5 text-sm"><div><dt className="text-xs font-semibold text-muted">Cobertura</dt><dd className="mt-1 text-ink">{agreement.coverage}</dd></div><div><dt className="text-xs font-semibold text-muted">Modalidad</dt><dd className="mt-1 text-ink">{agreement.modalities.join(" · ")}</dd></div><div><dt className="text-xs font-semibold text-muted">Red adherida</dt><dd className="mt-1 text-ink">{agreement.professionalCount} profesionales</dd></div></dl>
              </div>
              <div className="rounded-[1.35rem] border border-senda/20 bg-senda-soft p-6">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em] text-ink">Beneficios</h2>
                <ul className="mt-4 space-y-3 text-sm leading-5 text-muted">{agreement.benefits.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="font-bold text-senda-dark">✓</span>{item}</li>)}</ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {professionals.length ? (
        <section className="bg-canvas py-14 sm:py-18">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Red adherida</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">Profesionales del convenio</h2></div><Link href="/profesionales" className={buttonStyles({ variant: "secondary" })}>Explorar toda la red</Link></div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">{professionals.map((professional) => <ProfessionalCard key={professional.id} professional={professional} />)}</div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
