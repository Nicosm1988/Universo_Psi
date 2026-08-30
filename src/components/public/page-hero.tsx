import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/public/breadcrumbs";

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rs-atmosphere-hero relative overflow-hidden border-b border-line py-10 sm:py-12 lg:py-16">
      <div aria-hidden="true" className="absolute -right-20 -top-28 size-64 rounded-[42%_58%_65%_35%/56%_45%_55%_44%] border border-senda/15" />
      <Container>
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <div className={`mt-6 grid items-end gap-8 ${aside ? "lg:grid-cols-[1.3fr_.7fr]" : ""}`}>
          <div className="max-w-[56rem]">
            <Badge tone="senda">{eyebrow}</Badge>
            <h1 className="mt-4 font-display text-[clamp(2.3rem,5.4vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.04em] text-ink text-balance">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted text-pretty sm:text-base">{description}</p>
            {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
