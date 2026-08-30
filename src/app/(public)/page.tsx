import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import {
  HomeNetworkShowcaseFallback,
  HomeNetworkShowcaseSection,
} from "@/components/public/home-network-showcase-section";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { professionalTypeOptions } from "@/lib/demo/public-data";

export const metadata: Metadata = {
  title: "Encontrá un profesional de salud mental",
  description:
    "Buscá psicólogos, psiquiatras, psicopedagogos y otros profesionales de salud mental. Compará perfiles y contactá a la persona indicada.",
  alternates: { canonical: "/" },
};

const commonSearches = [
  ["ansiedad", "Ansiedad"],
  ["animo-y-depresion", "Estado de ánimo"],
  ["relacion-de-pareja", "Pareja"],
  ["duelo", "Duelo"],
] as const;

export default function HomePage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Universo Psi",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi-eight.vercel.app",
    description:
      "Red de profesionales de salud mental: psicólogos, psiquiatras, psicopedagogos y más.",
    areaServed: "AR",
  };

  return (
    <>
      <JsonLd data={organizationJsonLd} />

      <section
        className="rs-atmosphere-hero overflow-hidden py-5 max-[359px]:py-3 sm:py-6 lg:py-7"
        data-testid="home-search-hero"
      >
        <Container>
          <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[1.45rem] border border-line bg-paper shadow-soft lg:grid lg:grid-cols-[minmax(0,.78fr)_minmax(460px,1.22fr)]">
            <div className="flex flex-col justify-between overflow-hidden bg-ink px-5 py-5 text-white max-[359px]:py-4 sm:px-7 sm:py-7 lg:p-8">
              <div>
                <Badge tone="clay" className="hidden sm:inline-flex">Acompañamiento profesional</Badge>
                <h1 className="max-w-xl font-display text-[clamp(1.8rem,3vw,2.5rem)] font-medium leading-[1.04] tracking-[-0.045em] text-balance sm:mt-4">
                  Encontrá tu profesional.
                </h1>
                <p className="mt-1 max-w-lg text-[11px] leading-4 text-white/72 sm:mt-3 sm:text-sm sm:leading-6">
                  <span className="max-[359px]:hidden">
                    Compará profesionales de salud mental por especialidad, modalidad y opiniones. Elegí un perfil y enviá tu consulta de forma directa.
                  </span>
                  <span className="hidden max-[359px]:inline">
                    Profesionales de salud mental para acompañarte.
                  </span>
                </p>
              </div>

              <div className="mt-7 hidden border-t border-white/14 pt-4 sm:block">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/68" aria-label="Características del servicio">
                  <li>Buscar es gratis</li>
                  <li>Perfiles revisados</li>
                  <li>Opiniones visibles</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/ingresar?next=/profesionales" className={buttonStyles({ variant: "inverse", size: "sm" })}>
                    Ingresar para contactar
                  </Link>
                  <Link
                    href="/registro?next=/profesionales"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/28 px-4 text-xs font-semibold text-white transition-colors hover:border-white hover:bg-white/8 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sand/50 motion-reduce:transition-none"
                  >
                    Crear cuenta gratuita
                  </Link>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 max-[359px]:py-4 sm:px-7 sm:py-7 lg:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda max-[359px]:hidden">Buscar en la red</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.035em] text-ink max-[359px]:hidden sm:mt-1.5 sm:text-2xl">
                Empezá tu búsqueda.
              </h2>

              <form action="/profesionales" method="get" className="mt-3 max-[359px]:mt-0 sm:mt-4" role="search">
                <label htmlFor="home-search" className="text-sm font-semibold text-ink">
                  ¿Qué necesitás trabajar?
                </label>
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  autoComplete="off"
                  maxLength={80}
                  placeholder="Ej.: ansiedad, terapia de pareja…"
                  className="mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-canvas px-4 text-base text-ink placeholder:text-muted/75 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30 sm:text-sm"
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <label className="sr-only" htmlFor="home-professional-type">
                    Tipo de profesional
                  </label>
                  <select
                    id="home-professional-type"
                    name="type"
                    defaultValue=""
                    className="min-h-11 w-full rounded-xl border border-line-strong bg-paper px-4 text-base text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30 sm:text-sm"
                  >
                    <option value="">Tipo de profesional</option>
                    {professionalTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="sr-only" htmlFor="home-modality">
                    Modalidad
                  </label>
                  <select
                    id="home-modality"
                    name="modality"
                    defaultValue=""
                    className="min-h-11 w-full rounded-xl border border-line-strong bg-paper px-4 text-base text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30 sm:text-sm"
                  >
                    <option value="">Online o presencial</option>
                    <option value="online">Online</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>

                <button type="submit" className={`${buttonStyles()} mt-3 w-full max-[359px]:mt-2`}>
                  Buscar profesionales
                </button>
              </form>

              <div className="mt-3 flex items-center justify-center gap-3 text-xs font-semibold sm:hidden">
                <Link
                  href="/ingresar?next=/profesionales"
                  className="rounded-sm text-senda-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30"
                >
                  Ingresar para contactar
                </Link>
                <span aria-hidden="true" className="text-line-strong">·</span>
                <Link
                  href="/registro?next=/profesionales"
                  className="rounded-sm text-senda-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30"
                >
                  Crear cuenta gratuita
                </Link>
              </div>

              <div className="mt-4 border-t border-line pt-4 sm:mt-5">
                <p className="text-xs font-semibold text-muted">Búsquedas frecuentes</p>
                <div className="-mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {commonSearches.map(([need, label]) => (
                    <Link
                      key={need}
                      href={`/profesionales?need=${need}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-canvas px-4 text-xs font-semibold text-ink transition-colors hover:border-senda hover:bg-senda-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30 motion-reduce:transition-none"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              <p className="mt-4 hidden text-xs leading-5 text-muted sm:block">
                Entrá a un perfil para conocer su enfoque, leer valoraciones y enviarle tus datos de contacto.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Suspense fallback={<HomeNetworkShowcaseFallback />}>
        <HomeNetworkShowcaseSection />
      </Suspense>
    </>
  );
}
