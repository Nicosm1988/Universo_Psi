import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  activePaymentAccountKey, assertCheckoutMatches, createOneTimeCheckout,
  createSubscriptionCheckout, fetchPreapproval, findSubscriptionCheckout, findOneTimeCheckout,
  paymentAvailability, verifyPaymentAccountIdentity, resolvePaymentAccount, createCardSubscription, MercadoPagoHttpError, cancelPendingPreapproval,
} from "@/lib/integrations/payments";
import { reconcilePreapproval } from "@/lib/subscriptions/reconcile";
import { reconcileSubscriptionResources } from "@/lib/subscriptions/reconcile-search";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutFailure, type CheckoutStage } from "@/lib/subscriptions/checkout-diagnostics";

const snapshotSchema = z.object({
  code: z.string().min(1), name: z.string().optional(),
  price_amount: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().positive().finite()),
  currency: z.string().length(3), pricing_status: z.literal("PUBLISHED"),
  payment_model: z.enum(["RECURRING", "ONE_TIME"]),
});

/** A URL is returned only after the provider resource has been durably linked.
 * A reservation prevents concurrent/uncertain POST retries; recovery fetches the
 * original resource, preserving the account and commercial snapshot selected.
 */
export async function createCheckoutRedirectUrl(
  supabase: SupabaseClient,
  params: { subscriptionId: string; profileId: string; payerEmail?: string },
): Promise<string | null> {
  if (!z.uuid().safeParse(params.subscriptionId).success || !z.uuid().safeParse(params.profileId).success) return checkoutFailure("input", "invalid_input");
  let stage: CheckoutStage = "subscription_read";
  try {
    // Read through the request client (RLS) and bind the profile before any admin write.
    const { data: row, error: readError } = await supabase.from("subscriptions")
      .select("plan_snapshot,status,provider_account,provider_subscription_id,provider_plan_id")
      .eq("id", params.subscriptionId).eq("professional_profile_id", params.profileId).maybeSingle();
    if (readError) return checkoutFailure(stage, "database_error", readError);
    if (!row) return checkoutFailure(stage, "missing_subscription");
    if (row.status !== "PENDING_PAYMENT") return checkoutFailure(stage, "subscription_not_pending");
    stage = "snapshot";
    const parsed = snapshotSchema.safeParse(row.plan_snapshot);
    if (!parsed.success) return checkoutFailure(stage, "invalid_snapshot");
    const snapshot = parsed.data;
    if (snapshot.payment_model === "RECURRING" && !z.email().safeParse(params.payerEmail).success) return checkoutFailure("input", "invalid_input");
    stage = "configuration";
    const accountKey = z.enum(["personal", "company"]).parse(row.provider_account ?? activePaymentAccountKey());
    if (!paymentAvailability(accountKey).configured) return checkoutFailure(stage, "not_configured");
    stage = "account_identity";
    await verifyPaymentAccountIdentity(accountKey);
    const admin = createAdminClient();
    const input = { subscriptionId: params.subscriptionId, planName: snapshot.name ?? "Plan profesional", amount: snapshot.price_amount, currency: snapshot.currency, accountKey };

    let providerPlanId: string | null = row.provider_plan_id ?? null;
    if (snapshot.payment_model === "RECURRING" && !row.provider_account) {
      stage = "plan_lookup";
      const { data, error } = await admin.rpc("lookup_plan_provider_id", { p_plan_code: snapshot.code, p_provider_account: accountKey });
      if (error) return checkoutFailure(stage, "database_error", error);
      providerPlanId = z.string().min(1).nullable().parse(data);
    }
    stage = "reservation";
    const { data: mayCreate, error: reservationError } = await admin.rpc("begin_subscription_checkout", {
      p_subscription_id: params.subscriptionId, p_provider_account: accountKey, p_expected_plan_snapshot: row.plan_snapshot,
    });
    if (reservationError) return checkoutFailure(stage, "database_error", reservationError);
    if (typeof mayCreate !== "boolean") return checkoutFailure(stage, "invalid_rpc_result");

    let alreadyAuthorized = false;
    let redirectUrl: string;
    let providerSubscriptionId: string;
    if (snapshot.payment_model === "ONE_TIME") {
      stage = mayCreate ? "provider_create" : "provider_recovery";
      const checkout = mayCreate
        ? await createOneTimeCheckout(input)
        : await findOneTimeCheckout(input, row.provider_plan_id);
      if (!checkout) return checkoutFailure(stage, "resource_not_found");
      providerPlanId = checkout.providerSubscriptionId;
      redirectUrl = checkout.initPoint;
      providerSubscriptionId = params.subscriptionId;
    } else {
      stage = "provider_recovery";
      const previous = row.provider_subscription_id
        ? await fetchPreapproval(row.provider_subscription_id, accountKey)
        : !mayCreate ? await findSubscriptionCheckout(params.subscriptionId, accountKey) : null;
      if (previous) {
        stage = "provider_validation";
        assertCheckoutMatches(previous, input, true);
        alreadyAuthorized = previous.status === "authorized";
        providerSubscriptionId = previous.id;
        redirectUrl = previous.initPoint;
      } else {
        if (!mayCreate) return checkoutFailure(stage, "resource_not_found");
        stage = "provider_create";
        const checkout = await createSubscriptionCheckout({ ...input, payerEmail: params.payerEmail!, providerPlanId });
        providerSubscriptionId = checkout.providerSubscriptionId;
        redirectUrl = checkout.initPoint;
      }
    }
    stage = "attachment";
    const { error: attachError } = await admin.rpc("attach_subscription_checkout", {
      p_subscription_id: params.subscriptionId, p_provider_account: accountKey,
      p_provider_subscription_id: providerSubscriptionId, p_provider_plan_id: providerPlanId,
      p_expected_plan_snapshot: row.plan_snapshot,
    });
    if (attachError) return checkoutFailure(stage, "database_error", attachError);
    if (alreadyAuthorized) {
      // Consent may have happened while the link response was lost. Attach first,
      // then recover actual payments; never ask for a second authorization.
      stage = "reconciliation";
      await reconcileSubscriptionResources({ subscriptionId: params.subscriptionId,
        providerSubscriptionId, accountKey, paymentModel: "RECURRING" });
      return "/dashboard?subscription=checkout-return";
    }
    return redirectUrl;
  } catch (error) {
    // Avoid logging provider bodies, email addresses, or arbitrary database details.
    return checkoutFailure(stage, "operation_failed", error);
  }
}

/** Read only: visiting checkout must not reserve or create a provider resource. */
export async function getHostedCheckoutContext(supabase: SupabaseClient, subscriptionId: string, profileId: string, allowCanceledRecovery = false) {
  const { data: row, error } = await supabase.from("subscriptions")
    .select("plan_snapshot,status,provider_account,provider_subscription_id,provider_plan_id")
    .eq("id", subscriptionId).eq("professional_profile_id", profileId).maybeSingle();
  if (error || !row || (row.status !== "PENDING_PAYMENT" && !(allowCanceledRecovery && row.status === "CANCELED"))) return null;
  const snapshot = snapshotSchema.safeParse(row.plan_snapshot);
  if (!snapshot.success) return null;
  const accountKey = z.enum(["personal", "company"]).parse(row.provider_account ?? activePaymentAccountKey());
  const account = resolvePaymentAccount(accountKey);
  if (!paymentAvailability(accountKey).configured || !account) return null;
  return { row, snapshot: snapshot.data, accountKey, publicKey: account.publicKey };
}

export async function getEmbeddedCheckoutContext(supabase: SupabaseClient, subscriptionId: string, profileId: string, allowCanceledRecovery = false) {
  const context = await getHostedCheckoutContext(supabase, subscriptionId, profileId, allowCanceledRecovery);
  return context?.publicKey && context.snapshot.payment_model === "RECURRING" ? { ...context, publicKey: context.publicKey } : null;
}

export async function createHostedCheckoutRedirectUrl(supabase: SupabaseClient,
  params: { subscriptionId: string; profileId: string }) {
  if (!z.uuid().safeParse(params.subscriptionId).success || !z.uuid().safeParse(params.profileId).success) return null;
  const context = await getHostedCheckoutContext(supabase, params.subscriptionId, params.profileId);
  return context ? `/dashboard/suscripcion/pagar?subscriptionId=${params.subscriptionId}` : null;
}

export async function createEmbeddedCheckoutRedirectUrl(supabase: SupabaseClient,
  params: { subscriptionId: string; profileId: string; email?: string | null }) {
  if (!z.uuid().safeParse(params.subscriptionId).success || !z.uuid().safeParse(params.profileId).success) return null;
  const context = await getEmbeddedCheckoutContext(supabase, params.subscriptionId, params.profileId);
  return context ? `/dashboard/suscripcion/pagar?subscriptionId=${params.subscriptionId}&checkout=card` : null;
}

export async function submitCardSubscription(supabase: SupabaseClient, profileId: string,
  input: { subscriptionId: string; payerEmail: string; cardTokenId: string; consent: true }) {
  const context = await getEmbeddedCheckoutContext(supabase, input.subscriptionId, profileId);
  if (!context) throw new Error("Checkout unavailable");
  const { row, snapshot, accountKey } = context;
  await verifyPaymentAccountIdentity(accountKey);
  const admin = createAdminClient();
  let providerPlanId = row.provider_plan_id as string | null;
  if (!row.provider_account) {
    const { data, error } = await admin.rpc("lookup_plan_provider_id", { p_plan_code: snapshot.code, p_provider_account: accountKey });
    if (error) throw new Error("Plan mapping unavailable");
    providerPlanId = z.string().nullable().parse(data);
  }
  const { data: reservations, error: reservationError } = await admin.rpc("reserve_card_checkout", {
    p_subscription_id: input.subscriptionId, p_provider_account: accountKey, p_expected_plan_snapshot: row.plan_snapshot,
  });
  const reservation = z.array(z.object({ may_create: z.boolean(), attempt_id: z.uuid().nullable() })).length(1).safeParse(reservations);
  if (reservationError || !reservation.success) throw new Error("Checkout reservation unavailable");
  const { may_create: mayCreate, attempt_id: attemptId } = reservation.data[0]!;
  if (mayCreate !== Boolean(attemptId)) throw new Error("Checkout lease identity unavailable");
  const previous = row.provider_subscription_id ? await fetchPreapproval(row.provider_subscription_id, accountKey)
    : !mayCreate ? await findSubscriptionCheckout(input.subscriptionId, accountKey) : null;
  let provider = previous;
  if (previous) {
    // A legacy pending hosted checkout already has a payer. Do not silently change
    // that payer or create another subscription alongside the existing contract.
    if (previous.status !== "authorized" || previous.externalReference !== input.subscriptionId || previous.amount !== snapshot.price_amount || previous.currency !== snapshot.currency) {
      throw new Error("Existing checkout requires recovery");
    }
  } else {
    if (!mayCreate) throw new Error("Uncertain checkout requires recovery");
    try {
      provider = await createCardSubscription({ subscriptionId: input.subscriptionId,
        payerEmail: input.payerEmail, cardTokenId: input.cardTokenId,
        amount: snapshot.price_amount, currency: snapshot.currency,
        planName: snapshot.name ?? "Plan profesional", accountKey, providerPlanId });
    } catch (error) {
      // Only a definitive validation rejection permits a new token/attempt.
      // Timeout, conflict, rate limit and server errors retain the reservation.
      if (attemptId && error instanceof MercadoPagoHttpError && [400, 422].includes(error.status)) {
        const { error: releaseError } = await admin.rpc("release_failed_card_checkout", {
          p_subscription_id: input.subscriptionId, p_attempt_id: attemptId, p_http_status: error.status,
        });
        if (releaseError) throw new Error("Checkout rejection recovery unavailable");
      }
      throw error;
    }
  }
  if (!provider) throw new Error("Checkout provider missing");
  const { error: attachError } = await admin.rpc("attach_subscription_checkout", {
    p_subscription_id: input.subscriptionId, p_provider_account: accountKey,
    p_provider_subscription_id: provider.id, p_provider_plan_id: providerPlanId,
    p_expected_plan_snapshot: row.plan_snapshot,
  });
  if (attachError) throw new Error("Checkout attachment unavailable");
  if (previous) {
    await reconcileSubscriptionResources({ subscriptionId: input.subscriptionId,
      providerSubscriptionId: provider.id, accountKey, paymentModel: "RECURRING" });
    const { data: current, error } = await supabase.from("subscriptions").select("status")
      .eq("id", input.subscriptionId).eq("professional_profile_id", profileId).maybeSingle();
    if (error || !current) throw new Error("Subscription status unavailable");
    if (current.status === "ACTIVE") return { status: "ACTIVE" as const };
  }
  return { status: "PENDING_PAYMENT" as const };
}


export async function restartPendingCardCheckout(supabase: SupabaseClient, subscriptionId: string, profileId: string) {
  const context = await getHostedCheckoutContext(supabase, subscriptionId, profileId, true);
  if (!context || context.snapshot.payment_model !== "RECURRING") throw new Error("Checkout unavailable");
  const { row, snapshot, accountKey } = context;
  await verifyPaymentAccountIdentity(accountKey);
  const previous = row.provider_subscription_id ? await fetchPreapproval(row.provider_subscription_id, accountKey)
    : await findSubscriptionCheckout(subscriptionId, accountKey);
  if (!previous || previous.externalReference !== subscriptionId || (previous.status !== "pending" && previous.status !== "cancelled") || previous.amount !== snapshot.price_amount || previous.currency !== snapshot.currency) throw new Error("Checkout cannot be restarted");
  if (!row.provider_subscription_id) {
    const { error } = await createAdminClient().rpc("attach_subscription_checkout", {
      p_subscription_id: subscriptionId, p_provider_account: accountKey,
      p_provider_subscription_id: previous.id, p_provider_plan_id: row.provider_plan_id,
      p_expected_plan_snapshot: row.plan_snapshot,
    });
    if (error) throw new Error("Legacy checkout attachment failed");
  }
  await cancelPendingPreapproval(previous.id, accountKey);
  await reconcilePreapproval(previous.id, accountKey);
  const { data, error } = await supabase.rpc("select_professional_plan", { p_profile_id: profileId, p_plan_code: snapshot.code });
  if (error || !z.uuid().safeParse(data).success) throw new Error("Replacement selection unavailable");
  return data as string;
}
