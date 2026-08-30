import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ResourceArticle } from "@/lib/demo/public-data";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function ResourceCard({ article, featured = false }: { article: ResourceArticle; featured?: boolean }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[1.5rem] border border-line bg-paper p-6 transition-colors hover:border-senda/45 motion-reduce:transition-none ${featured ? "sm:p-8 lg:grid lg:grid-cols-[.75fr_1.25fr] lg:gap-12" : ""}`}
    >
      <div className={`${featured ? "mb-8 lg:mb-0" : "mb-7"} relative flex min-h-40 items-end overflow-hidden rounded-[1rem] bg-senda-soft p-5`}>
        <div aria-hidden="true" className="absolute -right-8 -top-12 size-36 rounded-[46%_54%_65%_35%/43%_37%_63%_57%] border border-senda/25" />
        <span className="relative text-xs font-bold uppercase tracking-[0.12em] text-senda-dark">{article.eyebrow}</span>
      </div>
      <div className="flex flex-col">
        {article.isDemo === false ? null : <div className="mb-3"><Badge tone="clay">Contenido demo</Badge></div>}
        <p className="text-xs font-semibold text-muted">
          {dateFormatter.format(new Date(article.publishedAt))} · {article.readingTime} de lectura
        </p>
        <h2 className={`${featured ? "mt-4 text-3xl sm:text-4xl" : "mt-3 text-2xl"} font-display font-semibold leading-[1.08] tracking-[-0.035em] text-ink text-balance`}>
          <Link href={`/recursos/${article.slug}`} className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35">
            {article.title}
          </Link>
        </h2>
        <p className="mt-4 text-sm leading-6 text-muted text-pretty">{article.excerpt}</p>
        <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs">
          <span className="font-semibold text-ink">Por {article.author}</span>
          <span className="font-bold text-senda-dark">Leer recurso →</span>
        </div>
      </div>
    </article>
  );
}
