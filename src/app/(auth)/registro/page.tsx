import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Crear cuenta | Universo Psi",
  description: "Creá tu cuenta para avanzar con acompañamiento profesional.",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Empezá por acá</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
        Un lugar para tu próximo movimiento.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        La cuenta es gratuita. Tus datos de contacto nunca se publican sin tu permiso.
      </p>
      <SignUpForm next={params.next} />
    </>
  );
}
