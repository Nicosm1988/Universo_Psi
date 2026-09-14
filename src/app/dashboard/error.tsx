"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <section className="rounded-3xl border border-line bg-paper p-7" role="alert">
    <h1 className="text-2xl font-semibold">No pudimos cargar tu espacio</h1>
    <p className="mt-3 text-muted">Intentá nuevamente. Tus datos guardados se conservan.</p>
    <button type="button" onClick={retry} className={`${buttonStyles()} mt-6 mr-3`}>Reintentar</button>
    <Link href="/dashboard" className={`${buttonStyles({ variant: "secondary" })} mt-6`}>Volver al inicio</Link>
  </section>;
}
