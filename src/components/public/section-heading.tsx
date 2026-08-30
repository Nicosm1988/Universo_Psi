import { Badge } from "@/components/ui/badge";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <Badge tone="senda">{eyebrow}</Badge>
      <h2 className="mt-4 font-display text-2xl font-semibold leading-[1.12] tracking-[-0.025em] text-ink text-balance sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted text-pretty sm:text-base">{description}</p> : null}
    </div>
  );
}
