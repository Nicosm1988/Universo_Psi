import type { Route } from "next";
import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items, inverse = false }: { items: BreadcrumbItem[]; inverse?: boolean }) {
  return (
    <nav aria-label="Migas de pan" className={`text-xs font-semibold ${inverse ? "text-white/60" : "text-muted"}`}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link className={`rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 ${inverse ? "focus-visible:ring-white" : "focus-visible:ring-senda"}`} href={item.href as Route}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={inverse ? "text-white" : "text-ink"}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
