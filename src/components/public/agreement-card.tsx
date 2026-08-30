import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import type { Agreement } from "@/lib/demo/public-data";

export function AgreementCard({ agreement }: { agreement: Agreement }) {
  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-line bg-paper p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sand font-display text-lg font-semibold text-ink">
          {agreement.institutionInitials}
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {agreement.isDemo === false ? null : <Badge tone="clay">Convenio demo</Badge>}
          <Badge>{agreement.kind}</Badge>
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold text-senda-dark">{agreement.institution}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-ink">{agreement.title}</h2>
      <p className="mt-4 flex-1 text-sm leading-6 text-muted">{agreement.excerpt}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-xs">
        <div>
          <dt className="font-semibold text-muted">Cobertura</dt>
          <dd className="mt-1 text-ink">{agreement.coverage}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Profesionales</dt>
          <dd className="mt-1 text-ink">{agreement.professionalCount} adheridos</dd>
        </div>
      </dl>
      <Link href={`/convenios/${agreement.slug}`} className={`${buttonStyles({ variant: "secondary" })} mt-6 w-full`}>
        Ver condiciones
      </Link>
    </article>
  );
}
