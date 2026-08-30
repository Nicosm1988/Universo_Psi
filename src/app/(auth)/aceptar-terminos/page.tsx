import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptCurrentTermsAction } from "@/app/(auth)/actions";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal/auth";

export const metadata: Metadata = {
  title: "Aceptar términos | Universo Psi",
  robots: { index: false, follow: false },
};

export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  const params = await searchParams;

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Antes de continuar</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
        Acordemos cómo cuidamos tus datos.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        Leé la versión vigente de los documentos legales. Tu aceptación queda registrada con fecha de servidor y no reemplaza versiones anteriores.
      </p>
      {params.error ? (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {params.error}
        </p>
      ) : null}
      <form action={acceptCurrentTermsAction} className="mt-7 space-y-5">
        <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
        <label className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-sm leading-relaxed text-muted">
          <input className="mt-1 size-4" type="checkbox" name="terms" required />
          <span>
            Leí y acepto los <Link className="font-semibold text-ink underline" href="/terminos" target="_blank">términos</Link> y la <Link className="font-semibold text-ink underline" href="/privacidad" target="_blank">política de privacidad</Link> vigentes.
          </span>
        </label>
        <button className={buttonStyles({ size: "lg" })} type="submit">Aceptar y continuar</button>
      </form>
    </>
  );
}
