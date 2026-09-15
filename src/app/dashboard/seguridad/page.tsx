import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/dal/auth";
import { safeInternalPath } from "@/lib/http/origin";
import { createClient } from "@/lib/supabase/server";
import { SecuritySettings } from "./security-settings";

export const metadata: Metadata = { title: "Seguridad de tu cuenta | Universo Psi", robots: { index: false, follow: false } };
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireCurrentUser("/dashboard/seguridad");
  const supabase = await createClient();
  const [{ data, error }, { data: claims }] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.getClaims()]);
  if (error) throw new Error("No pudimos consultar la seguridad de tu cuenta. Volvé a intentar.");
  const next = safeInternalPath((await searchParams).next ?? null);
  return <section className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
    <h1 className="text-3xl font-semibold text-ink">Seguridad de tu cuenta</h1>
    <p className="mt-3 text-muted">Usá una aplicación autenticadora para proteger tu cuenta. Para administrar Universo Psi, esta verificación es obligatoria.</p>
    <SecuritySettings factors={(data?.totp ?? []).map(({ id, friendly_name }) => ({ id, name: friendly_name ?? "Aplicación autenticadora" }))} verified={claims?.claims?.aal === "aal2"} next={next} />
  </section>;
}
