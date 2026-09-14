import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { z } from "zod";

import { RestartPendingCheckout } from "@/components/subscriptions/restart-pending-checkout";
import { SubscriptionCardForm } from "@/components/subscriptions/subscription-card-form";
import { requireCurrentUser } from "@/lib/dal/auth";
import { startHostedSubscriptionCheckoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { getHostedCheckoutContext } from "@/lib/subscriptions/checkout";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Autorizar suscripción", robots: { index: false, follow: false } };

export default async function SubscriptionCheckoutPage({ searchParams }: { searchParams: Promise<{ subscriptionId?: string; checkout?: string; error?: string }> }) {
  const query = await searchParams;
  const id = z.uuid().safeParse(query.subscriptionId);
  await requireCurrentUser(id.success ? `/dashboard/suscripcion/pagar?subscriptionId=${id.data}` : "/dashboard#suscripcion");
  const supabase = await createClient();
  const { data: profile, error } = await supabase.rpc("my_professional_profile").select("id").maybeSingle();
  const context = id.success && profile && !error ? await getHostedCheckoutContext(supabase, id.data, profile.id) : null;
  if (!context || !id.success) return <section className="rounded-3xl border border-line bg-paper p-7">
    <h1 className="text-3xl font-semibold">No hay un pago disponible para continuar</h1>
    <p className="mt-4 text-muted">Revisá el estado de tu suscripción. Si el cobro todavía no está habilitado, tu elección queda guardada.</p>
    <Link href="/dashboard#suscripcion" className="mt-5 inline-flex min-h-11 items-center font-semibold text-senda underline">Volver a mi suscripción</Link>
  </section>;
  const embedded = query.checkout === "card" && context.publicKey && context.snapshot.payment_model === "RECURRING";
  const nonce = embedded ? (await headers()).get("x-nonce") ?? undefined : undefined;
  const price = new Intl.NumberFormat("es-AR", { style: "currency", currency: context.snapshot.currency }).format(context.snapshot.price_amount);
  return <section className="mx-auto max-w-2xl rounded-3xl border border-line bg-paper p-6 sm:p-9">
    <p className="text-xs font-bold uppercase tracking-widest text-senda">Suscripción profesional</p>
    <h1 className="mt-3 text-3xl font-semibold">{context.snapshot.name ?? "Plan profesional"}</h1>
    <p className="mt-4 text-xl font-semibold">{price} {context.snapshot.currency}{context.snapshot.payment_model === "RECURRING" ? " por mes" : ""}</p>
    <p className="mt-3 leading-6 text-muted">Podrás pagar con tu cuenta de Mercado Pago o con el medio de pago disponible. El email de tu cuenta en Universo Psi no tiene que coincidir con el de Mercado Pago.</p>
    {context.row.provider_account && context.snapshot.payment_model === "RECURRING" ? <RestartPendingCheckout subscriptionId={id.data} /> : null}
    {embedded ? <SubscriptionCardForm subscriptionId={id.data} publicKey={context.publicKey!} amount={context.snapshot.price_amount} currency={context.snapshot.currency} nonce={nonce} /> :
      <form action={startHostedSubscriptionCheckoutAction} className="mt-6 space-y-5">
        <input type="hidden" name="subscriptionId" value={id.data} />
        {context.snapshot.payment_model === "RECURRING" ? <div>
          <label htmlFor="payerEmail" className="block text-sm font-semibold">Email del pagador en Mercado Pago</label>
          <input id="payerEmail" name="payerEmail" type="email" required maxLength={254} autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-4 focus-visible:outline-2 focus-visible:outline-senda" />
        </div> : null}
        {query.error ? <p role="alert" className="text-sm">No pudimos abrir el pago. Revisá los datos e intentá nuevamente.</p> : null}
        <Button type="submit">Continuar a Mercado Pago</Button>
        {context.publicKey && context.snapshot.payment_model === "RECURRING" ? <Link href={{ pathname: "/dashboard/suscripcion/pagar", query: { subscriptionId: id.data, checkout: "card" } }} className="flex min-h-11 items-center text-sm font-semibold text-senda underline">Pagar con tarjeta desde Universo Psi</Link> : null}
      </form>}

  </section>;
}
