"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function PageError({ retry }: { retry: () => void }) {
  return <main id="contenido" className="mx-auto max-w-3xl px-6 py-16" role="alert">
    <h1 className="text-3xl font-semibold">No pudimos cargar esta página</h1>
    <p className="mt-4 text-muted">Intentá nuevamente para continuar.</p>
    <button className={`${buttonStyles()} mt-6 mr-3`} type="button" onClick={retry}>Reintentar</button>
    <Link className={`${buttonStyles({ variant: "secondary" })} mt-6`} href="/dashboard">Ir a mi espacio</Link>
  </main>;
}
