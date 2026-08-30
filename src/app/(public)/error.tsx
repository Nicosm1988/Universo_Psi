"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-canvas py-20 sm:py-28" aria-labelledby="public-error-title">
      <Container className="max-w-3xl text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-clay-soft text-clay-dark">
          <AlertCircle aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-clay-dark">Interrupción temporal</p>
        <h1 id="public-error-title" className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
          No pudimos cargar esta información.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted">
          Tus datos no se perdieron. Podés volver a intentar ahora o regresar más tarde.
        </p>
        <Button className="mt-7" onClick={reset}>Volver a intentar</Button>
      </Container>
    </section>
  );
}
