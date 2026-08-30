import type { HTMLAttributes } from "react";

const styles = {
  neutral: "border-line bg-paper text-muted",
  senda: "border-senda/20 bg-senda-soft text-senda-dark",
  clay: "border-clay/25 bg-clay-soft text-clay-dark",
  ink: "border-ink bg-ink text-white",
} as const;

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof styles }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.09em] ${styles[tone]} ${className}`}
      {...props}
    />
  );
}
