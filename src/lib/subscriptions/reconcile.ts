import "server-only";

import { z } from "zod";

import {
  fetchRecurringPayment, fetchPayment, fetchPreapproval, fetchPaymentSubscriptionReference, findRecurringInvoiceForPayment, MercadoPagoHttpError,
  SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS, verifyPaymentAccountIdentity,
  type MercadoPagoPayment, type PaymentAccountKey,
} from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";

const persistenceCodes = new Set([
  "22007", "22023", "22P02", "23502", "23503", "23505", "23514", "3F000", "42501",
  "42703", "42804", "42883", "42P01", "P0001", "P0002", "PGRST116", "PGRST202", "PGRST204", "PGRST301",
]);
class ReconciliationPersistenceError extends Error {
  readonly databaseCode?: string;
  constructor(readonly phase: "subscription_persistence" | "payment_persistence" | "subscription_lookup", error: unknown) {
    super(phase === "subscription_lookup" ? "Payment subscription lookup failed" : "Mercado Pago reconciliation persistence failed");
    this.name = "ReconciliationPersistenceError";
    if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && persistenceCodes.has(error.code)) {
      this.databaseCode = error.code;
    }
  }
}

/** Fixed phases and allowlisted codes only. Never serialize an Error, provider
 * body, database message/details, resource identifiers, or payer/card data.
 */
export function reconciliationFailureDetails(error: unknown): { phase: string; databaseCode?: string; providerStatus?: number } {
  if (error instanceof ReconciliationPersistenceError) return { phase: error.phase, ...(error.databaseCode ? { databaseCode: error.databaseCode } : {}) };
  if (error instanceof MercadoPagoHttpError) return {
    phase: "provider_read",
    ...(Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? { providerStatus: error.status } : {}),
  };
  if (error instanceof z.ZodError) return { phase: "resource_validation" };
  return { phase: "resource_reconciliation" };
}

export async function reconcilePreapproval(id: string, account: PaymentAccountKey) {
  await verifyPaymentAccountIdentity(account);
  const preapproval = await fetchPreapproval(id, account);
  const { error } = await createAdminClient().rpc("apply_subscription_webhook_event", {
    p_provider_subscription_id: preapproval.id,
    p_provider_account: account, p_subscription_id: preapproval.externalReference,
    p_amount: preapproval.amount, p_currency: preapproval.currency,
    p_external_event_id: `${account}:preapproval:${preapproval.id}:${preapproval.modifiedAt}:${preapproval.status}`,
    p_event_type: "subscription_preapproval",
    p_status: SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[preapproval.status],
    p_period_start: null, p_period_end: null, p_next_payment_at: preapproval.nextPaymentDate,
    p_payload: { id: preapproval.id, status: preapproval.status },
    p_occurred_at: preapproval.modifiedAt,
  });
  if (error) throw new ReconciliationPersistenceError("subscription_persistence", error);
}

async function applyPayment(payment: MercadoPagoPayment, providerSubscriptionId: string, account: PaymentAccountKey, type: "payment" | "subscription_authorized_payment") {
  const { error } = await createAdminClient().rpc("apply_subscription_payment_event", {
    p_provider_subscription_id: providerSubscriptionId, p_provider_account: account,
    p_subscription_id: payment.externalReference, p_amount: payment.amount, p_currency: payment.currency,
    p_provider_payment_id: payment.id, p_event_type: type,
    p_external_event_id: `${account}:payment:${payment.id}:${payment.modifiedAt}:${payment.status}`,
    p_payment_status: payment.status, p_paid_at: payment.dateApproved,
    p_payload: { id: payment.id, status: payment.status, date_created: payment.createdAt }, p_occurred_at: payment.modifiedAt,
  });
  if (error) throw new ReconciliationPersistenceError("payment_persistence", error);
}

export async function reconcileAuthorizedPayment(id: string, account: PaymentAccountKey) {
  const recurring = await fetchRecurringPayment(id, account);
  if (!recurring) return;
  const { preapproval, payment } = recurring;
  await applyPayment(payment, preapproval.id, account, "subscription_authorized_payment");
}

export async function reconcileOneTimePayment(id: string, account: PaymentAccountKey) {
  await verifyPaymentAccountIdentity(account);
  const payment = await fetchPayment(id, account);
  await applyPayment(payment, payment.externalReference, account, "payment");
}

const linkedSubscriptionSchema = z.object({
  id: z.uuid(), provider: z.literal("MERCADO_PAGO"), provider_account: z.enum(["personal", "company"]),
  provider_subscription_id: z.string().min(1),
  plan_snapshot: z.object({ payment_model: z.enum(["RECURRING", "ONE_TIME"]), price_amount: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().positive().finite()), currency: z.string().length(3) }),
});

/** The payment topic includes both recurring and one-time charges. Notification
 * metadata cannot select the model; the authenticated reference and stored link do.
 */
export async function reconcilePaymentNotification(id: string, account: PaymentAccountKey) {
  const reference = await fetchPaymentSubscriptionReference(id, account);
  const { data, error } = await createAdminClient().from("subscriptions")
    .select("id,provider,provider_account,provider_subscription_id,plan_snapshot")
    .eq("id", reference).maybeSingle();
  if (error) throw new ReconciliationPersistenceError("subscription_lookup", error);
  const subscription = linkedSubscriptionSchema.parse(data);
  if (subscription.id !== reference || subscription.provider_account !== account) throw new Error("Payment subscription identity mismatch");
  let payment: MercadoPagoPayment;
  const recurring = subscription.plan_snapshot.payment_model === "RECURRING";
  if (recurring) {
    const invoiceId = await findRecurringInvoiceForPayment({ paymentId: id, preapprovalId: subscription.provider_subscription_id, subscriptionId: subscription.id, account });
    const result = await fetchRecurringPayment(invoiceId, account);
    if (!result || result.preapproval.id !== subscription.provider_subscription_id) throw new Error("Payment invoice linkage mismatch");
    payment = result.payment;
  } else {
    if (subscription.provider_subscription_id !== reference) throw new Error("One-time payment linkage mismatch");
    payment = await fetchPayment(id, account);
  }
  if (payment.id !== id || payment.externalReference !== subscription.id || payment.amount !== subscription.plan_snapshot.price_amount || payment.currency !== subscription.plan_snapshot.currency) {
    throw new Error("Payment does not match linked subscription snapshot");
  }
  // The RPC repeats linkage/snapshot checks under a row lock and shares the same
  // resource-version deduplication key with subscription_authorized_payment.
  await applyPayment(payment, subscription.provider_subscription_id, account, recurring ? "subscription_authorized_payment" : "payment");
}
