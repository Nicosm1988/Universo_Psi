import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

import { googleAvailability } from "@/lib/auth/providers";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Ingresar | Universo Psi",
  description: "Ingresá a tu cuenta de Universo Psi.",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [params, google] = await Promise.all([searchParams, googleAvailability()]);

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Acceso profesional</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
        Entrá a tu espacio profesional.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        Gestioná tu perfil, tus credenciales y las consultas que recibís.
      </p>
      <SignInForm googleAvailable={google === "available"} next={params.next} error={params.error} />

      <div className="mt-10 rounded-2xl border border-line bg-canvas p-5">
        <p className="text-sm font-semibold text-ink">¿Estás buscando un profesional?</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          No hace falta que crees una cuenta. Buscá, compará perfiles y escribile directamente a quien elijas.
        </p>
        <Link className={`${buttonStyles({ size: "sm" })} mt-4`} href="/profesionales">
          Buscar profesional
        </Link>
      </div>
    </>
  );
}
