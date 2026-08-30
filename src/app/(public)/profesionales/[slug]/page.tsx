import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { AnalyticsPageView } from "@/components/analytics/page-view";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ContactForm } from "@/components/public/contact-form";
import { ProfessionalCard } from "@/components/public/professional-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";
import { formatRating, getNeedLabel } from "@/lib/demo/public-data";

type ProfessionalPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return publicRepository.listProfessionalSlugs();
}

export async function generateMetadata({ params }: ProfessionalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const professional = await publicRepository.getProfessional(slug);
  if (!professional) return { title: "Perfil no encontrado" };

  return {
    title: `${professional.name} · ${professional.role}`,
    description: `${professional.headline} Conocé su enfoque, experiencia, modalidades y disponibilidad en Universo Psi.`,
    alternates: { canonical: `/profesionales/${professional.slug}` },
    openGraph: {
      type: "profile",
      title: `${professional.name} en Universo Psi`,
      description: professional.headline,
      url: `/profesionales/${professional.slug}`,
    },
  };
}

export default async function ProfessionalProfilePage({ params }: ProfessionalPageProps) {
  const { slug } = await params;
  const professional = await publicRepository.getProfessional(slug);
  if (!professional) notFound();

  const compatible = await publicRepository.listProfessionals({ need: professional.needs, sort: "match" });
  const otherProfessionals = compatible.filter((item) => item.slug !== professional.slug).slice(0, 2);
  const reviewLabel = `${professional.reviewCount} ${professional.reviewCount === 1 ? "opinión" : "opiniones"}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: professional.name,
    description: professional.headline,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi-eight.vercel.app"}/profesionales/${professional.slug}`,
    areaServed: { "@type": "Country", name: professional.country },
    address: {
      "@type": "PostalAddress",
      addressLocality: professional.city,
      addressCountry: "AR",
    },
    provider: {
      "@type": "Person",
      name: professional.name,
      jobTitle: professional.role,
    },
    aggregateRating: professional.reviewCount
      ? {
          "@type": "AggregateRating",
          ratingValue: professional.rating,
          reviewCount: professional.reviewCount,
          bestRating: 5,
        }
      : undefined,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AnalyticsPageView eventName="professional_profile_viewed" professionalProfileId={professional.id} />

      <section className="border-b border-line bg-canvas py-9 sm:py-12">
        <Container>
          <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Profesionales", href: "/profesionales" }, { label: professional.name }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_310px] lg:items-end">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar initials={professional.initials} size="xl" toneIndex={Number(professional.id.at(-1)) || 0} />
              <div>
                <div className="flex flex-wrap gap-2">
                  {professional.isDemo === false ? null : <Badge>Perfil demo</Badge>}
                  {professional.verified ? <Badge tone="senda">✓ Perfil verificado</Badge> : <Badge>Verificación en curso</Badge>}
                  {professional.featured ? <Badge tone="clay">Perfil destacado</Badge> : null}
                </div>
                <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-ink text-balance sm:text-5xl">{professional.name}</h1>
                <p className="mt-3 text-sm font-bold text-senda-dark sm:text-base">{professional.role}</p>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-ink text-pretty">{professional.headline}</p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                  <span>{professional.city}, {professional.country}</span>
                  <span>{professional.modalities.map((mode) => (mode === "online" ? "Online" : "Presencial")).join(" · ")}</span>
                  <span><span aria-hidden="true" className="text-clay">★</span> {formatRating(professional.rating)} · {reviewLabel}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-line bg-paper p-5">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-senda-dark">Contacto</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink">{professional.availabilityLabel}</p>
              <p className="mt-2 text-xs text-muted">
                <span aria-hidden="true" className="text-clay">★</span> {formatRating(professional.rating)} · {reviewLabel}
              </p>
              {professional.acceptingLeads === false ? (
                <p className="mt-5 rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-muted">Consultas pausadas por el momento</p>
              ) : (
                <Link href="#contactar" className={`${buttonStyles()} mt-5 w-full`}>Contactar ahora</Link>
              )}
              <Link
                href={`/ingresar?next=/profesionales/${professional.slug}%23contactar`}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
              >
                Ingresar a mi cuenta
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {professional.acceptingLeads === false ? null : (
        <nav aria-label="Acciones del perfil" className="sticky top-16 z-30 border-b border-line bg-paper/95 py-2 backdrop-blur lg:hidden">
          <Container className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs font-semibold text-ink">{professional.name}</p>
            <Link href="#contactar" className={buttonStyles({ size: "sm" })}>Contactar ahora</Link>
          </Container>
        </nav>
      )}

      <section id="contactar" aria-labelledby="contact-title" className="scroll-mt-28 bg-senda-dark py-10 text-white sm:py-12">
        <Container>
          {professional.acceptingLeads === false ? (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-sand">Agenda pausada</p>
              <h2 id="contact-title" className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Este perfil no recibe consultas por el momento.</h2>
              <p className="mt-4 text-sm leading-6 text-white/68">Podés comparar otros enfoques y disponibilidades en el directorio.</p>
              <Link href="/profesionales" className={`${buttonStyles({ variant: "inverse" })} mt-6`}>Ver otros perfiles</Link>
            </div>
          ) : (
            <div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr] lg:items-start lg:gap-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-sand">Primer contacto</p>
                <h2 id="contact-title" className="mt-3 text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-balance sm:text-4xl">Contactá a {professional.name.split(" ")[0]}.</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/68">Dejá tus datos y una consulta breve. No incluyas información clínica, documentos ni datos sensibles.</p>
              </div>
              <div className="rounded-[1.5rem] bg-paper p-5 text-ink sm:p-7">
                <ContactForm
                  professionalId={professional.id}
                  professionalName={professional.name}
                  isDemo={professional.isDemo !== false}
                  needs={professional.contactNeeds?.length
                    ? professional.contactNeeds
                    : professional.needs.map((need) => ({ id: need, label: getNeedLabel(need) }))}
                />
              </div>
            </div>
          )}
        </Container>
      </section>

      <div className="bg-paper py-10 sm:py-12">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-12">
            <div className="min-w-0">
              <section aria-labelledby="sobre-mi" className="border-b border-line pb-8">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Conocer a la persona</p>
                <h2 id="sobre-mi" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Sobre mí</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted text-pretty">{professional.about}</p>
              </section>

              <section aria-labelledby="acompanar" className="border-b border-line py-8">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Situaciones</p>
                <h2 id="acompanar" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">En qué puedo acompañarte</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {professional.needs.map((need, index) => (
                    <div key={need} className="rounded-[1.15rem] border border-line bg-canvas p-4">
                      <span className="text-xs font-bold text-clay">0{index + 1}</span>
                      <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-ink">{getNeedLabel(need)}</h3>
                    </div>
                  ))}
                </div>
                <div className="mt-7">
                  <h3 className="text-sm font-bold text-ink">Especialidades</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {professional.specialties.map((specialty) => <li key={specialty} className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted">{specialty}</li>)}
                  </ul>
                </div>
              </section>

              <section aria-labelledby="como-trabajo" className="border-b border-line py-8">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Enfoque</p>
                <h2 id="como-trabajo" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Cómo trabajo</h2>
                <ol className="mt-5 space-y-3">
                  {professional.workingStyle.map((item, index) => (
                    <li key={item} className="grid grid-cols-[2rem_1fr] gap-3 rounded-[1.15rem] bg-canvas p-4">
                      <span className="text-xl font-semibold text-clay">{index + 1}</span>
                      <p className="text-sm leading-6 text-muted">{item}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby="trayectoria" className="border-b border-line py-8">
                <div className="grid gap-10 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Recorrido</p>
                    <h2 id="trayectoria" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Experiencia</h2>
                    <ol className="mt-6 space-y-6 border-l border-line pl-5">
                      {professional.experience.map((item) => (
                        <li key={`${item.role}-${item.organization}`}>
                          <h3 className="text-sm font-bold text-ink">{item.role}</h3>
                          <p className="mt-1 text-sm text-muted">{item.organization}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Formación</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Estudios</h2>
                    <ul className="mt-6 space-y-5">
                      {professional.education.map((item) => (
                        <li key={item.title} className="border-b border-line pb-5 last:border-0">
                          <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                          <p className="mt-1 text-sm leading-5 text-muted">{item.institution}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section aria-labelledby="opiniones" className="py-8">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Experiencias moderadas</p>
                <h2 id="opiniones" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Opiniones</h2>
                {professional.testimonials.length ? (
                  <div className="mt-7 grid gap-4">
                    {professional.testimonials.map((testimonial) => (
                      <figure key={testimonial.quote} className="rounded-[1.25rem] border border-line bg-canvas p-5">
                        <blockquote className="text-base font-medium leading-7 tracking-[-0.01em] text-ink">“{testimonial.quote}”</blockquote>
                        <figcaption className="mt-5 text-xs text-muted"><strong className="text-ink">{testimonial.author}</strong> · {testimonial.context}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 rounded-[1.15rem] bg-canvas p-5 text-sm leading-6 text-muted">Este perfil todavía no tiene experiencias publicadas. Todas las opiniones pasan por moderación antes de aparecer.</p>
                )}
              </section>

            </div>

            <aside aria-label="Información práctica" className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              {professional.acceptingLeads === false ? null : (
                <div className="rounded-[1.35rem] border border-senda/30 bg-paper p-5 shadow-soft">
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">¿Querés conversar?</h2>
                  <p className="mt-2 text-xs leading-5 text-muted">Volvé al formulario y enviá tu consulta directamente.</p>
                  <Link href="#contactar" className={`${buttonStyles()} mt-4 w-full`}>Contactar ahora</Link>
                </div>
              )}
              <div className="rounded-[1.35rem] border border-line bg-canvas p-5">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em] text-ink">Información práctica</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="border-b border-line pb-4"><dt className="text-xs font-semibold text-muted">Modalidad</dt><dd className="mt-1 text-ink">{professional.modalities.map((mode) => (mode === "online" ? "Online" : `Presencial en ${professional.city}`)).join(" · ")}</dd></div>
                  <div className="border-b border-line pb-4"><dt className="text-xs font-semibold text-muted">Idiomas</dt><dd className="mt-1 capitalize text-ink">{professional.languages.join(" · ")}</dd></div>
                  <div className="border-b border-line pb-4"><dt className="text-xs font-semibold text-muted">Públicos</dt><dd className="mt-1 text-ink">{professional.audiences.join(" · ")}</dd></div>
                  <div><dt className="text-xs font-semibold text-muted">Industrias</dt><dd className="mt-1 text-ink">{professional.industries.join(" · ")}</dd></div>
                </dl>
              </div>
              <div className="rounded-[1.35rem] border border-senda/20 bg-senda-soft p-5">
                <Badge tone="senda">{professional.verified ? "Verificación completa" : "En revisión"}</Badge>
                <ul className="mt-4 space-y-2 text-xs leading-5 text-muted">
                  {professional.credentials.map((credential) => <li key={credential} className="flex gap-2"><span aria-hidden="true" className="text-senda-dark">✓</span>{credential}</li>)}
                </ul>
                <p className="mt-4 border-t border-senda/15 pt-4 text-[0.7rem] leading-5 text-muted">La documentación respaldatoria es privada y sólo puede verla el equipo autorizado de verificación.</p>
              </div>
            </aside>
          </div>
        </Container>
      </div>

      {otherProfessionals.length ? (
        <section className="bg-canvas py-14 sm:py-18">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Seguir comparando</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">Otros enfoques compatibles</h2></div>
              <Link href="/profesionales" className={buttonStyles({ variant: "secondary" })}>Volver al buscador</Link>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">{otherProfessionals.map((item) => <ProfessionalCard key={item.id} professional={item} />)}</div>
          </Container>
        </section>
      ) : null}

      <section data-testid="profile-final-cta" aria-labelledby="profile-final-cta-title" className="border-t border-line bg-paper py-8 sm:py-10">
        <Container>
          <div className="flex flex-col gap-5 rounded-[1.35rem] border border-senda/25 bg-senda-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Próximo paso</p>
              <h2 id="profile-final-cta-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink text-balance">
                {professional.acceptingLeads === false ? "Compará otros perfiles disponibles." : `Contactá a ${professional.name.split(" ")[0]}.`}
              </h2>
            </div>
            <div className="flex flex-col gap-2 min-[390px]:flex-row">
              {professional.acceptingLeads === false ? null : (
                <Link href="#contactar" className={buttonStyles()}>Contactar a {professional.name.split(" ")[0]}</Link>
              )}
              <Link href="/profesionales" className={buttonStyles({ variant: "secondary" })}>Volver al buscador</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
