import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSubscriptionCheckout, paymentAvailability } from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";

type PlanSnapshot = { name?: string; price_amount?: number | string | null; currency?: string };

/**
 * Creates a Mercado Pago checkout for a just-selected subscription and
 * returns the URL to redirect the professional to. Returns null (never
 * throws) whenever payment isn't configured, the plan has no published
 * price, or Mercado Pago's API call fails — callers should fall back to
 * the existing "we'll notify you" messaging in that case rather than
 * blocking the rest of the onboarding flow.
 */
export async function createCheckoutRedirectUrl(
  supabase: SupabaseClient,
  params: { subscriptionId: string; profileId: string; email: string | null | undefined },
): Promise<string | null> {
  const payment = paymentAvailability();
  if (!payment.configured || !params.email) return null;

  const { data: subscriptionRow } = await supabase
    .from("subscriptions")
    .select("plan_snapshot")
    .eq("id", params.subscriptionId)
    .maybeSingle();

  const snapshot = subscriptionRow?.plan_snapshot as PlanSnapshot | undefined;
  const amount =
    snapshot?.price_amount === null || snapshot?.price_amount === undefined
      ? null
      : Number(snapshot.price_amount);
  if (!amount || !Number.isFinite(amount) || !snapshot?.currency) return null;

  try {
    const checkout = await createSubscriptionCheckout({
      subscriptionId: params.subscriptionId,
      payerEmail: params.email,
      planName: snapshot.name ?? "Plan profesional",
      amount,
      currency: snapshot.currency,
    });

    const admin = createAdminClient();
    await admin.rpc("attach_subscription_checkout", {
      p_subscription_id: params.subscriptionId,
      p_external_subscription_id: checkout.externalSubscriptionId,
    });
    await admin.rpc("upsert_payment_customer", {
      p_profile_id: params.profileId,
      p_external_customer_id: params.email,
    });

    return checkout.initPoint;
  } catch (error) {
    console.error("Mercado Pago checkout creation failed", error);
    return null;
  }
}
