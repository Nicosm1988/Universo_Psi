import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { formatRating, getNeedLabel, type Professional } from "@/lib/demo/public-data";

type ProfessionalCardProps = {
  professional: Professional;
  priority?: boolean;
  variant?: "card" | "listing";
};

function ProfessionalListingCard({ professional, priority }: Omit<ProfessionalCardProps, "variant">) {
  const reviewLabel = `${professional.reviewCount} ${professional.reviewCount === 1 ? "opinión" : "opiniones"}`;

  return (
    <article
      data-testid="professional-card"
      className={`group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-4 rounded-[1.35rem] border bg-paper p-4 transition-colors duration-200 hover:border-senda/45 motion-reduce:transition-none sm:gap-x-4 md:grid-cols-[4rem_minmax(0,1fr)_10.5rem] md:gap-x-5 ${
        professional.featured ? "border-clay/35" : "border-line"
      }`}
    >
      <div className="pt-0.5">
        <Avatar
          initials={professional.initials}
          size="md"
          toneIndex={Number(professional.id.at(-1)) || 0}
          className="md:size-16 md:text-base"
        />
      </div>

      <div className="min-w-0">
        <header data-card-section="identity" className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
          {priority ? <span className="sr-only">Resultado recomendado. </span> : null}
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-xl">
              <Link
                href={`/profesionales/${professional.slug}`}
                className="rounded-sm underline-offset-4 hover:text-senda-dark hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
              >
                {professional.name}
              </Link>
            </h2>
            <p className="mt-0.5 text-sm font-semibold leading-5 text-senda-dark">{professional.role}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:max-w-[24rem] lg:justify-end">
            {professional.verified ? (
              <Badge tone="senda">✓ Verificado</Badge>
            ) : (
              <Badge tone="neutral">Verificación en curso</Badge>
            )}
            {professional.featured ? <Badge tone="clay">Perfil destacado</Badge> : null}
            {professional.isDemo === false ? null : <Badge tone="neutral">Perfil demo</Badge>}
          </div>
        </header>

        <p data-card-section="headline" className="mt-2 max-w-4xl text-sm font-medium leading-6 text-ink text-pretty">
          {professional.headline}
        </p>

        <ul data-card-section="needs" aria-label="Necesidades que acompaña" className="mt-2 flex flex-wrap gap-1.5">
          {professional.needs.slice(0, 3).map((need) => (
            <li key={need} className="rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-medium leading-5 text-muted">
              {getNeedLabel(need)}
            </li>
          ))}
        </ul>

        <dl
          data-card-section="facts"
          className="mt-3 grid gap-3 border-t border-line pt-3 text-xs min-[480px]:grid-cols-2 min-[480px]:gap-4"
        >
          <div className="min-w-0">
            <dt className="font-semibold text-muted">Modalidad</dt>
            <dd className="mt-1 break-words leading-5 text-ink">
              {professional.modalities.map((item) => (item === "online" ? "Online" : "Presencial")).join(" · ")}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-muted">Ubicación</dt>
            <dd className="mt-1 break-words leading-5 text-ink">{professional.city}</dd>
          </div>
        </dl>
      </div>

      <footer
        data-card-section="actions"
        className="col-span-2 flex flex-col gap-4 border-t border-line pt-4 md:col-span-1 md:border-l md:border-t-0 md:pl-5 md:pt-0"
      >
        <div>
          <p className="text-sm font-semibold leading-5 text-senda-dark">{professional.availabilityLabel}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            <span aria-hidden="true" className="text-clay">★</span> {formatRating(professional.rating)} · {reviewLabel}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 md:grid-cols-1">
          <Link
            className={buttonStyles({ size: "sm", className: "w-full" })}
            href={`/profesionales/${professional.slug}#contactar`}
          >
            Contactar
          </Link>
          <Link
            className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}
            href={`/profesionales/${professional.slug}`}
          >
            Ver perfil
          </Link>
        </div>
      </footer>
    </article>
  );
}

export function ProfessionalCard({ professional, priority = false, variant = "card" }: ProfessionalCardProps) {
  if (variant === "listing") {
    return <ProfessionalListingCard professional={professional} priority={priority} />;
  }

  const reviewLabel = `${professional.reviewCount} ${professional.reviewCount === 1 ? "opinión" : "opiniones"}`;

  return (
    <article
      data-testid="professional-card"
      className={`group relative row-span-5 grid h-full grid-rows-subgrid gap-5 overflow-hidden rounded-[1.6rem] border bg-paper p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-senda/45 motion-reduce:transform-none motion-reduce:transition-none sm:p-6 ${
        professional.featured ? "border-clay/35" : "border-line"
      }`}
    >
      <header data-card-section="identity" className="flex min-w-0 items-start gap-4">
        {priority ? <span className="sr-only">Resultado recomendado. </span> : null}
        <Avatar initials={professional.initials} size="lg" toneIndex={Number(professional.id.at(-1)) || 0} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {professional.isDemo === false ? null : <Badge tone="neutral">Perfil demo</Badge>}
            {professional.featured ? <Badge tone="clay">Perfil destacado</Badge> : null}
            {professional.verified ? (
              <Badge tone="senda">✓ Verificado</Badge>
            ) : (
              <Badge tone="neutral">Verificación en curso</Badge>
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-ink text-balance">
            <Link
              href={`/profesionales/${professional.slug}`}
              className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
            >
              {professional.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm font-semibold text-senda-dark">{professional.role}</p>
        </div>
      </header>

      <p data-card-section="headline" className="text-sm font-medium leading-6 text-ink text-pretty">{professional.headline}</p>

      <ul data-card-section="needs" aria-label="Necesidades que acompaña" className="relative flex content-start flex-wrap gap-2">
        {professional.needs.slice(0, 3).map((need) => (
          <li key={need} className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-muted">
            {getNeedLabel(need)}
          </li>
        ))}
      </ul>

      <dl data-card-section="facts" className="relative grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-line text-xs">
        <div className="min-w-0 bg-paper p-3">
          <dt className="font-semibold text-muted">Modalidad</dt>
          <dd className="mt-1 break-words leading-5 text-ink">{professional.modalities.map((item) => (item === "online" ? "Online" : "Presencial")).join(" · ")}</dd>
        </div>
        <div className="min-w-0 border-l border-line bg-paper p-3">
          <dt className="font-semibold text-muted">Ubicación</dt>
          <dd className="mt-1 break-words leading-5 text-ink">{professional.city}</dd>
        </div>
      </dl>

      <footer data-card-section="actions" className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-senda-dark">{professional.availabilityLabel}</p>
          <p className="mt-1 text-xs text-muted">
            <span aria-hidden="true" className="text-clay">★</span> {formatRating(professional.rating)} · {reviewLabel}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 min-[430px]:flex-row sm:flex-col-reverse xl:flex-row">
          <Link className={buttonStyles({ variant: "secondary", size: "sm" })} href={`/profesionales/${professional.slug}`}>
            Ver perfil
          </Link>
          <Link className={buttonStyles({ size: "sm" })} href={`/profesionales/${professional.slug}#contactar`}>
            Contactar
          </Link>
        </div>
      </footer>
    </article>
  );
}
