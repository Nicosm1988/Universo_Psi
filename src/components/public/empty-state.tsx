import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function EmptyState({
  title = "No encontramos coincidencias con estos filtros",
  description = "Probá ampliar la modalidad o quitar algún criterio. Tu búsqueda sigue guardada en la URL.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-line-strong bg-canvas px-6 py-14 text-center sm:px-10">
      <span aria-hidden="true" className="mx-auto block size-12 rounded-[50%_50%_42%_58%/58%_42%_58%_42%] border-2 border-senda/35" />
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.025em] text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{description}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link className={buttonStyles()} href="/profesionales">
          Limpiar filtros
        </Link>
        <Link className={buttonStyles({ variant: "secondary" })} href="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
