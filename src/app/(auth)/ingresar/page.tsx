import type { Metadata } from "next";

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
  const params = await searchParams;

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Tu espacio</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
        Qué bueno volver a encontrarnos.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        Accedé a tus consultas, tu perfil y los próximos pasos de tu recorrido.
      </p>
      <SignInForm next={params.next} error={params.error} />
    </>
  );
}
