import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { EmptyState } from "@/components/public/empty-state";
import { ProfessionalCard } from "@/components/public/professional-card";
import { ProfessionalFiltersForm } from "@/components/public/professional-filters";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";
import { getNeedLabel, type ProfessionalFilters } from "@/lib/demo/public-data";

export const metadata: Metadata = {
  title: "Profesionales de salud mental",
  description: "Buscá psicólogos, psiquiatras, psicopedagogos y otros profesionales de salud mental por especialidad, modalidad, experiencia, opiniones y disponibilidad.",
  alternates: { canonical: "/profesionales" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const asArray = (value: string | string[] | undefined) => {
  if (!value) return undefined;
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
};

function parseFilters(params: Record<string, string | string[] | undefined>): ProfessionalFilters {
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    q: single("q")?.slice(0, 80),
    need: asArray(params.need),
    type: asArray(params.type),
    modality: asArray(params.modality),
    location: asArray(params.location),
    language: asArray(params.language),
    verified: single("verified") === "true",
    sort: single("sort") ?? "relevance",
  };
}

function countActiveFilters(filters: ProfessionalFilters) {
  return (
    (filters.q ? 1 : 0) +
    (filters.need?.length ?? 0) +
    (filters.type?.length ?? 0) +
    (filters.modality?.length ?? 0) +
    (filters.location?.length ?? 0) +
    (filters.language?.length ?? 0) +
    (filters.verified ? 1 : 0)
  );
}

export default async function ProfessionalsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const professionals = await publicRepository.listProfessionals(filters);
  const activeCount = countActiveFilters(filters);

  return (
    <>
      <section className="border-b border-line bg-canvas py-4 sm:py-5">
        <Container>
          <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Profesionales" }]} />
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">Salud mental</p>
              <h1 className="mt-1.5 break-words text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-3xl">
                Encontrá a tu profesional.
              </h1>
              <p className="mt-2 hidden max-w-3xl text-sm leading-6 text-muted text-pretty sm:block">
                Buscá por lo que necesitás, compará credenciales y opiniones, y contactá directamente.
              </p>
            </div>
            <Link href="/ingresar?next=/profesionales" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Ingresar
            </Link>
          </div>
        </Container>
      </section>

      <section id="resultados" className="scroll-mt-24 bg-canvas py-4 sm:py-5 lg:py-6">
        <Container>
          <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
            <aside aria-label="Filtros de profesionales" className="xl:sticky xl:top-24 xl:self-start">
              <ProfessionalFiltersForm selected={filters} activeCount={activeCount} />
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-paper px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-ink">
                    {professionals.length === 1 ? "1 profesional coincide" : `${professionals.length} profesionales coinciden`}
                  </p>
                  <p className="mt-1 hidden text-xs leading-5 text-muted sm:block">
                    El orden combina pertinencia, calidad del perfil y señales públicas. Los destacados siempre están identificados.
                  </p>
                </div>
                {filters.need?.length ? (
                  <div className="flex flex-wrap gap-2" aria-label="Necesidades seleccionadas">
                    {filters.need.map((need) => (
                      <span key={need} className="rounded-full bg-senda-soft px-3 py-1.5 text-xs font-semibold text-senda-dark">
                        {getNeedLabel(need)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {professionals.length ? (
                <div data-testid="professional-results" className="grid gap-3">
                  {professionals.map((professional, index) => (
                    <ProfessionalCard
                      key={professional.id}
                      professional={professional}
                      priority={index === 0}
                      variant="listing"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
