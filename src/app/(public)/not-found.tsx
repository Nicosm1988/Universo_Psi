import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function PublicNotFound() {
  return (
    <section className="bg-canvas py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-senda-dark">404 · Esta senda no continúa</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-none tracking-[-0.045em] text-ink sm:text-7xl">Volvamos a un lugar conocido.</h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted">
            La página pudo cambiar de dirección o todavía no existe. Podés volver al inicio o explorar profesionales.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonStyles({ variant: "secondary" })}>Volver al inicio</Link>
            <Link href="/profesionales" className={buttonStyles()}>Ver profesionales</Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
