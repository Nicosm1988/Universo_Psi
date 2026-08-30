import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  activePaymentAccountKey,
  createOneTimeCheckout,
  createSubscriptionCheckout,
  paymentAvailability,
} from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";

type PlanSnapshot = {
  code?: string;
  name?: string;
  price_amount?: number | string | null;
  currency?: string;
  payment_model?: "RECURRING" | "ONE_TIME";
};

/**
 * Creates a Mercado Pago checkout (recurring Preapproval or one-time
 * Checkout Pro preference, depending on the plan's payment_model) for a
 * just-selected subscription, and returns the URL to redirect the
 * professional to. Returns null (never throws) whenever payment isn't
 * configured, the plan has no published price, or Mercado Pago's API call
 * fails — callers fall back to the existing "we'll notify you" messaging.
 *
 * The redirect this URL leads to never activates the subscription by
 * itself — only the webhook, after re-fetching the authoritative state
 * from Mercado Pago, does that.
 */
export async function createCheckoutRedirectUrl(
  supabase: SupabaseClient,
  params: { subscriptionId: string; profileId: string; email: string | null | undefined },
): Promise<string | null> {
  const accountKey = activePaymentAccountKey();
  const payment = paymentAvailability(accountKey);
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
  if (!amount || !Number.isFinite(amount) || !snapshot?.currency || !snapshot?.code) return null;

  const admin = createAdminClient();

  try {
    if (snapshot.payment_model === "ONE_TIME") {
      const checkout = await createOneTimeCheckout({
        subscriptionId: params.subscriptionId,
        payerEmail: params.email,
        planName: snapshot.name ?? "Plan profesional",
        amount,
        currency: snapshot.currency,
        accountKey,
      });

      // One-time Checkout Pro preferences have no ongoing MP-side
      // "subscription" resource to key off — the `payment` webhook only
      // ever hands back `external_reference`, which is set to our own
      // subscription id below. So provider_subscription_id is OUR id
      // here, not Mercado Pago's preference id (that one only appears in
      // the checkout URL and is discarded once the professional pays).
      await admin.rpc("attach_subscription_checkout", {
        p_subscription_id: params.subscriptionId,
        p_provider_account: accountKey,
        p_provider_subscription_id: params.subscriptionId,
        p_provider_plan_id: null,
      });
      await admin.rpc("upsert_payment_customer", {
        p_profile_id: params.profileId,
        p_external_customer_id: params.email,
      });

      return checkout.initPoint;
    }

    const { data: providerPlanId } = await admin.rpc("lookup_plan_provider_id", {
      p_plan_code: snapshot.code,
      p_provider_account: accountKey,
    });

    const checkout = await createSubscriptionCheckout({
      subscriptionId: params.subscriptionId,
      payerEmail: params.email,
      planName: snapshot.name ?? "Plan profesional",
      amount,
      currency: snapshot.currency,
      accountKey,
      providerPlanId: (providerPlanId as string | null) ?? null,
    });

    await admin.rpc("attach_subscription_checkout", {
      p_subscription_id: params.subscriptionId,
      p_provider_account: accountKey,
      p_provider_subscription_id: checkout.providerSubscriptionId,
      p_provider_plan_id: (providerPlanId as string | null) ?? null,
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
