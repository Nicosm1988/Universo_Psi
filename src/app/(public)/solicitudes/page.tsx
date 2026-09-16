import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LegalRequestForm } from "@/components/public/legal-request-form";
import { legalRequestKinds } from "@/lib/validation/legal-request";
export const metadata: Metadata = { title: "Baja, arrepentimiento y privacidad", robots: { index: false, follow: true } };
export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = tipo && Object.hasOwn(legalRequestKinds, tipo) ? tipo as keyof typeof legalRequestKinds : "COMPLAINT";
  return <section className="bg-paper py-12 sm:py-20"><Container className="max-w-2xl"><h1 className="text-3xl font-semibold text-ink">Baja, arrepentimiento y privacidad</h1><p className="my-6 leading-7 text-muted">Podés registrar tu pedido sin crear una cuenta ni iniciar sesión. Recibirás una constancia en esta pantalla. Si necesitás otro canal, escribí a <a href="mailto:hola@universosenda.com" className="underline">hola@universosenda.com</a>.</p><LegalRequestForm initialKind={kind} /><p className="mt-6 text-sm text-muted">La baja de una suscripción, el cierre de cuenta y la eliminación de datos son gestiones diferentes. <Link className="underline" href="/privacidad">Cómo tratamos tus datos</Link>.</p></Container></section>;
}
