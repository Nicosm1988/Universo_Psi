import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

import { googleAvailability } from "@/lib/auth/providers";

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
  const [params, google] = await Promise.all([searchParams, googleAvailability()]);
  // La intención viaja en el destino: quien viene a publicarse ya trae
  // `next=/profesionales/sumarse` desde el botón que lo trajo hasta acá.
  const esProfesional = (params.next ?? "").includes("/profesionales/sumarse");

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">
        {esProfesional ? "Sumate como profesional" : "Creá tu cuenta"}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
        {esProfesional ? "Publicá tu perfil profesional." : "Seguí tus consultas en un solo lugar."}
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        {esProfesional
          ? "La cuenta es gratuita. Cargás tu perfil y tus credenciales, y lo enviás a revisión cuando esté listo."
          : "La cuenta es opcional y gratuita: podés buscar y escribir sin registrarte. Sirve para tener juntas las consultas que enviaste."}
      </p>
      <SignUpForm googleAvailable={google === "available"} next={params.next} />

      <div className="mt-10 rounded-2xl border border-line bg-canvas p-5">
        {esProfesional ? (
          <>
            <p className="text-sm font-semibold text-ink">¿Buscás un profesional para vos?</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              No hace falta cuenta para buscar y escribir.
            </p>
            <Link className={`${buttonStyles({ variant: "secondary", size: "sm" })} mt-4`} href="/profesionales">
              Buscar profesional
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">¿Atendés en salud mental?</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Publicá tu perfil y empezá a recibir consultas.
            </p>
            <Link
              className={`${buttonStyles({ variant: "secondary", size: "sm" })} mt-4`}
              href="/registro?next=/profesionales/sumarse"
            >
              Sumarme como profesional
            </Link>
          </>
        )}
      </div>
    </>
  );
}
