import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { AnalyticsPageView } from "@/components/analytics/page-view";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ResourceCard } from "@/components/public/resource-card";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";

type ResourcePageProps = { params: Promise<{ slug: string }> };
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function generateStaticParams() {
  return publicRepository.listResourceSlugs();
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await publicRepository.getResource(slug);
  if (!article) return { title: "Recurso no encontrado" };
  return {
    title: article.title,
    description: article.excerpt,
    authors: [{ name: article.author }],
    alternates: { canonical: `/recursos/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.excerpt, publishedTime: article.publishedAt, authors: [article.author] },
  };
}

export default async function ResourceDetailPage({ params }: ResourcePageProps) {
  const { slug } = await params;
  const article = await publicRepository.getResource(slug);
  if (!article) notFound();
  const resources = await publicRepository.listResources();
  const related = resources.filter((item) => item.slug !== article.slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: { "@type": "Person", name: article.author },
    publisher: { "@type": "Organization", name: "Universo Psi" },
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi.vercel.app"}/recursos/${article.slug}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AnalyticsPageView eventName="article_viewed" />
      <article>
        <header className="border-b border-line bg-canvas py-10 sm:py-14 lg:py-18">
          <Container className="max-w-[980px]">
            <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Recursos", href: "/recursos" }, { label: article.category }]} />
            <div className="mt-8 max-w-4xl">
              <div className="flex flex-wrap gap-2">
                {article.isDemo === false ? null : <Badge tone="clay">Contenido ficticio de demostración</Badge>}
                <Badge tone="senda">{article.eyebrow}</Badge>
              </div>
              <h1 className="mt-5 max-w-[58rem] font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink text-balance">{article.title}</h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-muted text-pretty">{article.excerpt}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-xs text-muted">
                <span><strong className="text-ink">{article.author}</strong> · {article.authorRole}</span>
                <time dateTime={article.publishedAt}>{dateFormatter.format(new Date(article.publishedAt))}</time>
                <span>{article.readingTime} de lectura</span>
              </div>
            </div>
          </Container>
        </header>

        <div className="bg-paper py-14 sm:py-18 lg:py-20">
          <Container className="max-w-[980px]">
            <div className="grid gap-12 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-16">
              <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Contenido del recurso">
                <p className="text-xs font-bold uppercase tracking-[0.11em] text-senda-dark">En este recurso</p>
                <ol className="mt-4 space-y-3 border-l border-line pl-4 text-xs leading-5 text-muted">
                  {article.sections.map((section, index) => <li key={section.heading}><a href={`#seccion-${index + 1}`} className="rounded-sm hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-senda">{section.heading}</a></li>)}
                </ol>
              </aside>
              <div className="min-w-0">
                <p className="font-display text-2xl font-medium leading-9 tracking-[-0.02em] text-ink text-pretty sm:text-3xl sm:leading-10">{article.lead}</p>
                <div className="mt-10 space-y-11">
                  {article.sections.map((section, index) => (
                    <section key={section.heading} id={`seccion-${index + 1}`} className="scroll-mt-28">
                      <div className="editorial-rule" aria-hidden="true" />
                      <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink">{section.heading}</h2>
                      <div className="mt-5 space-y-5">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-base leading-8 text-muted text-pretty">{paragraph}</p>)}</div>
                    </section>
                  ))}
                </div>

                <section aria-labelledby="ideas-clave" className="mt-12 rounded-[1.5rem] bg-senda-soft p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.11em] text-senda-dark">Para llevarte</p>
                  <h2 id="ideas-clave" className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">Tres ideas clave</h2>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
                    {article.takeaways.map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="font-bold text-senda-dark">✓</span>{item}</li>)}
                  </ul>
                </section>

                <aside aria-label="Sobre la autoría" className="mt-10 rounded-[1.35rem] border border-line p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.11em] text-muted">Escrito por</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{article.author}</h2>
                  <p className="mt-1 text-sm font-semibold text-senda-dark">{article.authorRole}</p>
                  {article.professionalSlug ? <Link href={`/profesionales/${article.professionalSlug}`} className={`${buttonStyles({ variant: "secondary", size: "sm" })} mt-5`}>Conocer su perfil</Link> : null}
                </aside>
              </div>
            </div>
          </Container>
        </div>
      </article>

      <section className="bg-canvas py-14 sm:py-18">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.11em] text-senda-dark">Seguir leyendo</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">Otros recursos para tu camino</h2></div><Link href="/recursos" className={buttonStyles({ variant: "secondary" })}>Ver todos</Link></div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">{related.map((item) => <ResourceCard key={item.slug} article={item} />)}</div>
        </Container>
      </section>

      <section className="bg-ink py-14 text-white sm:py-18">
        <Container>
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-sand">Del contenido a la conversación</p><h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.035em]">Si esta pregunta te toca de cerca, encontrá a alguien para trabajarla.</h2></div>
            <Link href="/profesionales" className={buttonStyles({ variant: "inverse", size: "lg" })}>Buscar profesionales</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
