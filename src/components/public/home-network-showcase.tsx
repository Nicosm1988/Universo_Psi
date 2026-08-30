"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export type HomeShowcaseProfessional = {
  slug: string;
  name: string;
  initials: string;
  role: string;
  headline: string;
  locationAndModality: string;
  availabilityLabel: string;
  ratingAndReviews: string;
  verified: boolean;
  isDemo: boolean;
  testimonial?: {
    quote: string;
    author: string;
    context: string;
  };
};

const AUTOPLAY_INTERVAL_MS = 7_000;

export function HomeNetworkShowcase({
  professionals,
}: {
  professionals: HomeShowcaseProfessional[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const professionalCount = professionals.length;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(motionQuery.matches);

    syncPreference();
    motionQuery.addEventListener("change", syncPreference);
    return () => motionQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const syncVisibility = () => setPageHidden(document.visibilityState === "hidden");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (professionalCount < 2 || paused || engaged || reducedMotion || pageHidden) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % professionalCount);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [engaged, pageHidden, paused, professionalCount, reducedMotion]);

  const activeProfessional = professionals[activeIndex % Math.max(professionalCount, 1)];
  const showPrevious = () => {
    setActiveIndex((currentIndex) =>
      (currentIndex - 1 + professionalCount) % professionalCount,
    );
  };
  const showNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % professionalCount);
  };

  return (
    <section
      aria-labelledby="home-network-title"
      className="border-y border-line bg-canvas py-8 sm:py-10"
    >
      <Container>
        <div className="mx-auto grid max-w-[1240px] gap-6 lg:grid-cols-[minmax(250px,.62fr)_minmax(0,1.38fr)] lg:items-stretch">
          <div className="flex flex-col justify-between rounded-[1.35rem] bg-ink p-5 text-white sm:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-sand">
                Qué es Universo Psi
              </p>
              <h2
                id="home-network-title"
                className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-balance sm:mt-3 sm:text-2xl"
              >
                Una red para elegir acompañamiento con más claridad.
              </h2>
              <p className="mt-3 text-xs leading-5 text-white/72 sm:mt-4 sm:text-sm sm:leading-6">
                Reúne profesionales de salud mental. Comparás enfoques,
                modalidades y opiniones; elegís un perfil y enviás tu consulta
                directamente.
              </p>
            </div>
            <div className="mt-6">
              <ul className="hidden space-y-2 text-xs font-semibold text-white/72 sm:block">
                <li>Perfiles revisados</li>
                <li>Opiniones visibles</li>
                <li>Contacto directo</li>
              </ul>
              <Link
                href="/profesionales"
                className={`${buttonStyles({ variant: "inverse", size: "sm" })} mt-4 sm:mt-5`}
              >
                Ver todos los profesionales
              </Link>
            </div>
          </div>

          <div
            role="region"
            aria-label="Profesionales y opiniones de Universo Psi"
            aria-roledescription="carrusel"
            className="min-w-0 rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft sm:p-6"
            onMouseEnter={() => setEngaged(true)}
            onMouseLeave={() => setEngaged(false)}
            onFocusCapture={() => setEngaged(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setEngaged(false);
              }
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">
                  Conocé la red
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-ink sm:text-xl">
                  Profesionales y opiniones
                </h3>
              </div>

              {professionalCount > 1 ? (
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-xs tabular-nums text-muted">
                    {activeIndex + 1} / {professionalCount}
                  </span>
                  <button
                    type="button"
                    aria-label="Ver profesional anterior"
                    className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-paper text-lg text-ink hover:border-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
                    onClick={showPrevious}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Ver siguiente profesional"
                    className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-paper text-lg text-ink hover:border-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
                    onClick={showNext}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={paused}
                    aria-label={paused ? "Activar rotación automática" : "Pausar rotación automática"}
                    className="hidden min-h-11 rounded-full px-3 text-xs font-semibold text-muted hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 motion-safe:inline-flex motion-safe:items-center"
                    onClick={() => setPaused((current) => !current)}
                  >
                    {paused ? "Activar rotación" : "Pausar rotación"}
                  </button>
                </div>
              ) : null}
            </div>

            {activeProfessional ? (
              <div
                aria-live={paused || engaged ? "polite" : "off"}
                aria-atomic="true"
                className="min-h-[230px]"
              >
                <article
                  key={activeProfessional.slug}
                  aria-label={`${activeProfessional.name}, ${activeProfessional.role}`}
                  aria-roledescription="diapositiva"
                  className="home-showcase-slide grid gap-4 py-4 sm:gap-5 sm:py-5 md:grid-cols-[minmax(0,1.08fr)_minmax(220px,.92fr)] md:items-stretch"
                  data-testid="home-professional-slide"
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-4">
                      <Avatar
                        initials={activeProfessional.initials}
                        size="md"
                        toneIndex={activeIndex}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          {activeProfessional.verified ? (
                            <Badge tone="senda">✓ Verificado</Badge>
                          ) : null}
                          {activeProfessional.isDemo ? <Badge>Perfil demo</Badge> : null}
                        </div>
                        <h4 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink sm:text-xl">
                          {activeProfessional.name}
                        </h4>
                        <p className="mt-1 text-sm font-semibold text-senda-dark">
                          {activeProfessional.role}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink">
                      {activeProfessional.headline}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>{activeProfessional.locationAndModality}</span>
                      <span>
                        <span aria-hidden="true" className="text-clay">★</span>{" "}
                        {activeProfessional.ratingAndReviews}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-senda-dark">
                      {activeProfessional.availabilityLabel}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/profesionales/${activeProfessional.slug}#contactar`}
                        className={buttonStyles({ size: "sm" })}
                      >
                        Contactar
                      </Link>
                      <Link
                        href={`/profesionales/${activeProfessional.slug}`}
                        className={buttonStyles({ variant: "secondary", size: "sm" })}
                      >
                        Ver perfil
                      </Link>
                    </div>
                  </div>

                  <figure className="flex min-w-0 flex-col justify-between rounded-[1.1rem] bg-senda-soft p-4 sm:p-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-senda-dark">
                        {activeProfessional.isDemo ? "Opinión demo" : "Opinión moderada"}
                      </p>
                      {activeProfessional.testimonial ? (
                        <blockquote className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-ink sm:line-clamp-4">
                          “{activeProfessional.testimonial.quote}”
                        </blockquote>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-muted">
                          Abrí el perfil para leer sus opiniones publicadas.
                        </p>
                      )}
                    </div>
                    {activeProfessional.testimonial ? (
                      <figcaption className="mt-5 text-xs leading-5 text-muted">
                        <strong className="text-ink">
                          {activeProfessional.testimonial.author}
                        </strong>{" "}
                        · {activeProfessional.testimonial.context}
                      </figcaption>
                    ) : null}
                  </figure>
                </article>
              </div>
            ) : (
              <div className="flex min-h-[250px] flex-col items-start justify-center py-6">
                <p className="text-sm leading-6 text-muted">
                  El directorio está listo para que compares perfiles y elijas a quién contactar.
                </p>
                <Link href="/profesionales" className={`${buttonStyles()} mt-5`}>
                  Buscar profesionales
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
