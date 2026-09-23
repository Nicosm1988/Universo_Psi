import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalEnvironment, paypalApiHosts, approvalLink, assertPayPalPlan, createPayPalResource, fetchPayPalResource, paypalApi, paypalConfigured, paypalId, paypalPrice, paypalPriceSchema } from "@/lib/integrations/paypal";

const snapshotSchema = z.object({ code: z.enum(["PROFESSIONAL_MONTHLY", "PROFESSIONAL_ANNUAL_UPFRONT"]), name: z.string(),
  pricing_status: z.literal("PUBLISHED"), payment_model: z.enum(["RECURRING", "ONE_TIME"]), billing_interval: z.enum(["MONTH", "YEAR"]) });
const operationSchema = z.object({ subscription_id: z.uuid(), external_reference: z.uuid(), payment_model: z.enum(["RECURRING", "ONE_TIME"]),
  price: paypalPriceSchema, provider_subscription_id: paypalId.nullable(), provider_order_id: paypalId.nullable(), created_at: z.string() });
type Operation = z.infer<typeof operationSchema>;
export async function paypalStore(action: string, data: object) {
  const result = await createAdminClient().rpc("paypal_operation", { p_action: action, p_data: { ...data, environment: paypalEnvironment() } });
  if (result.error) throw new Error("PayPal persistence failed");
  return result.data as unknown;
}
export async function getPayPalCheckoutContext(client: SupabaseClient, id: string, profileId: string) {
  const { data, error } = await client.from("subscriptions").select("plan_snapshot,status,provider")
    .eq("id", id).eq("professional_profile_id", profileId).maybeSingle();
  if (error || !data || data.status !== "PENDING_PAYMENT") return null;
  const snapshot = snapshotSchema.safeParse(data.plan_snapshot);
  if (!snapshot.success) return null;
  const old = data.provider === "paypal" ? operationSchema.safeParse(await paypalStore("lookup", { reference: null, resource_id: null, subscription_id: id })) : null;
  const price = old?.success ? old.data.price : paypalPrice(snapshot.data.code);
  return { snapshot: snapshot.data, rawSnapshot: data.plan_snapshot, provider: data.provider as string | null, price,
    available: paypalConfigured() && Boolean(price && (snapshot.data.payment_model === "ONE_TIME" || price.planId)) && (!data.provider || data.provider === "paypal") };
}
export async function startPayPalCheckout(client: SupabaseClient, subscriptionId: string, profileId: string) {
  const context = await getPayPalCheckoutContext(client, subscriptionId, profileId);
  if (!context?.available || !context.price) throw new Error("PayPal unavailable");
  if (context.snapshot.payment_model === "RECURRING") await assertPayPalPlan(context.price);
  const op = operationSchema.parse(await paypalStore("reserve", { subscription_id: subscriptionId, profile_id: profileId,
    snapshot: context.rawSnapshot, price: context.price }));
  const id = op.provider_subscription_id ?? op.provider_order_id;
  if (id) return approvalLink(await fetchPayPalResource(id, op.payment_model));
  // PayPal retains order request keys for 6h and subscription keys for 72h.
  // Never repeat an uncertain creation once that guarantee could have expired.
  if (Date.now() - Date.parse(op.created_at) >= 60 * 60 * 1000) throw new Error("Uncertain checkout requires operator reconciliation");
  const resource = await createPayPalResource(op.external_reference, op.price, op.payment_model);
  await paypalStore("attach", { subscription_id: subscriptionId, resource_id: resource.id });
  return approvalLink(resource);
}
const money = z.object({ currency_code: z.string(), value: z.string() });
const date = z.string().datetime({ offset: true });
function matchesMoney(value: z.infer<typeof money>, op: Operation) {
  return value.currency_code === op.price.currency && Number(value.value) === Number(op.price.amount);
}
export const paypalEventSchema = z.object({ id: paypalId, event_type: z.string().max(100), resource: z.object({ id: paypalId.optional(),
  sale_id: paypalId.optional(), links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
  billing_agreement_id: paypalId.optional(), supplementary_data: z.object({ related_ids: z.object({ order_id: paypalId.optional() }).optional() }).optional(),
}).passthrough() }).passthrough();
const eventTypes = new Set(["CHECKOUT.ORDER.APPROVED", "CHECKOUT.ORDER.COMPLETED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED",
  "BILLING.SUBSCRIPTION.CREATED", "BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.UPDATED", "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED", "PAYMENT.SALE.REFUNDED", "PAYMENT.SALE.REVERSED"]);
export async function processPayPalEvent(event: z.infer<typeof paypalEventSchema>) {
  if (!eventTypes.has(event.event_type)) return;
  let resourceId = event.resource.billing_agreement_id ?? event.resource.supplementary_data?.related_ids?.order_id ?? event.resource.id;
  let saleState: string | undefined;
  if (event.event_type.startsWith("PAYMENT.SALE.") && (!event.resource.billing_agreement_id || event.event_type !== "PAYMENT.SALE.COMPLETED")) {
    const saleId = event.resource.sale_id ?? event.resource.id;
    const sale = z.object({ id: paypalId, billing_agreement_id: paypalId, state: z.string() }).parse(await paypalApi(`/v1/payments/sale/${paypalId.parse(saleId)}`));
    if (sale.id !== saleId || (event.resource.billing_agreement_id && sale.billing_agreement_id !== event.resource.billing_agreement_id)) throw new Error("PayPal sale mismatch");
    resourceId = sale.billing_agreement_id; saleState = sale.state;
  }
  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED" && !event.resource.supplementary_data?.related_ids?.order_id) {
    const up = event.resource.links?.find(link => link.rel === "up");
    const url = new URL(up?.href ?? "https://invalid.invalid");
    const captureId = /^\/v2\/payments\/captures\/([A-Za-z0-9-]+)$/.exec(url.pathname)?.[1];
    if (url.protocol !== "https:" || !paypalApiHosts().includes(url.hostname) || !captureId || url.username || url.password || url.port) throw new Error("Missing capture reference");
    const capture = z.object({ supplementary_data: z.object({ related_ids: z.object({ order_id: paypalId }) }) }).parse(await paypalApi(`/v2/payments/captures/${captureId}`));
    resourceId = capture.supplementary_data.related_ids.order_id;
  }
  if (!resourceId) throw new Error("Missing PayPal resource");
  const raw = await paypalStore("lookup", { resource_id: resourceId });
  // Retry when a webhook beats durable attachment; never acknowledge it as processed.
  const op = operationSchema.parse(raw);
  const id = op.provider_subscription_id ?? op.provider_order_id;
  if (!id) throw new Error("PayPal attachment pending");
  const verifiedAt = new Date().toISOString();
  let status = "PENDING_PAYMENT";
  let providerStatus: string;
  let paidAt: string | undefined;
  let periodEnd: string | undefined;
  if (op.payment_model === "RECURRING") {
    const sub = z.object({ id: paypalId, custom_id: z.uuid(), plan_id: paypalId, status: z.string(),
      billing_info: z.object({ last_payment: z.object({ amount: money, time: date }).optional(), next_billing_time: date.optional(),
        failed_payments_count: z.number().optional(), outstanding_balance: money.optional() }).optional(),
    }).parse(await fetchPayPalResource(id, "RECURRING"));
    if (sub.id !== id || sub.custom_id !== op.external_reference || sub.plan_id !== op.price.planId) throw new Error("PayPal subscription mismatch");
    providerStatus = sub.status;
    if (sub.status === "CANCELLED") status = "CANCELED";
    else if (sub.status === "EXPIRED") status = "EXPIRED";
    else if (sub.status === "SUSPENDED") status = "PAUSED";
    else if (sub.status === "ACTIVE" && sub.billing_info?.last_payment) {
      const paid = sub.billing_info.last_payment;
      const start = new Date(Date.parse(paid.time) - 60000).toISOString();
      const end = new Date(Date.parse(paid.time) + 60000).toISOString();
      const transactions = z.object({ transactions: z.array(z.object({ id: paypalId, status: z.string(), time: date,
        amount_with_breakdown: z.object({ gross_amount: money }) })) }).parse(await paypalApi(`/v1/billing/subscriptions/${id}/transactions?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`));
      const completed = transactions.transactions.find(tx => tx.status === "COMPLETED" && Date.parse(tx.time) === Date.parse(paid.time) && matchesMoney(tx.amount_with_breakdown.gross_amount, op));
      if (completed && matchesMoney(paid.amount, op) && sub.billing_info.next_billing_time) {
        paidAt = paid.time; periodEnd = sub.billing_info.next_billing_time;
        status = Date.parse(periodEnd) > Date.now() ? "ACTIVE" : "PAST_DUE";
      }
      if ((sub.billing_info.failed_payments_count ?? 0) > 0 || Number(sub.billing_info.outstanding_balance?.value ?? 0) > 0) status = "PAST_DUE";
      // A reversed/refunded sale is queried directly, not trusted from event type.
      if (["PAYMENT.SALE.REFUNDED", "PAYMENT.SALE.REVERSED"].includes(event.event_type)) {
        if (["refunded", "partially_refunded", "reversed"].includes(saleState ?? "")) status = "PAUSED";
        else throw new Error("PayPal reversal not confirmed");
      }
    }
  } else {
    const orderSchema = z.object({ id: paypalId, intent: z.literal("CAPTURE"), status: z.string(), purchase_units: z.array(z.object({
      custom_id: z.uuid(), amount: money, payments: z.object({ captures: z.array(z.object({ id: paypalId, status: z.string(), amount: money, create_time: date })).optional() }).optional(),
    })).length(1) });
    let order = orderSchema.parse(await fetchPayPalResource(id, "ONE_TIME"));
    const assertOrder = () => { if (order.id !== id || order.purchase_units[0]!.custom_id !== op.external_reference || !matchesMoney(order.purchase_units[0]!.amount, op)) throw new Error("PayPal order mismatch"); };
    assertOrder();
    if (order.status === "APPROVED" && event.event_type === "CHECKOUT.ORDER.APPROVED") {
      await paypalApi(`/v2/checkout/orders/${id}/capture`, {}, op.external_reference);
      order = orderSchema.parse(await fetchPayPalResource(id, "ONE_TIME")); assertOrder();
    }
    providerStatus = order.status;
    const captures = order.purchase_units[0]!.payments?.captures ?? [];
    if (captures.length === 1) {
      const capture = z.object({ id: paypalId, status: z.string(), amount: money, create_time: date }).parse(await paypalApi(`/v2/payments/captures/${captures[0]!.id}`));
      if (capture.id !== captures[0]!.id || !matchesMoney(capture.amount, op)) throw new Error("PayPal capture mismatch");
      providerStatus = capture.status;
      if (order.status === "COMPLETED" && capture.status === "COMPLETED") {
        paidAt = capture.create_time;
        const end = new Date(paidAt); end.setUTCFullYear(end.getUTCFullYear() + 1); periodEnd = end.toISOString();
        status = end.getTime() > Date.now() ? "ACTIVE" : "EXPIRED";
      } else if (["REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"].includes(capture.status)) status = "PAUSED";
      else if (["DECLINED", "FAILED"].includes(capture.status)) status = "CANCELED";
    } else if (order.status === "VOIDED") status = "CANCELED";
  }
  if (["PAYMENT.SALE.COMPLETED", "PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.COMPLETED"].includes(event.event_type) && status === "PENDING_PAYMENT") throw new Error("Payment confirmation not yet visible; retry webhook");
  await paypalStore("event", { subscription_id: op.subscription_id, resource_id: id, event_id: event.id, event_type: event.event_type,
    verified_at: verifiedAt, status, provider_status: providerStatus, paid_at: paidAt, period_end: periodEnd, currency: op.price.currency, amount: op.price.amount });
}
