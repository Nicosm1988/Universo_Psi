import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

import { paypalPriceSchema, paypalPlansSchema } from "@/lib/env/paypal";
export { paypalPriceSchema };
export const paypalId = z.string().regex(/^[A-Za-z0-9-]{1,80}$/);
const money = z.object({ currency_code: z.string(), value: z.string() });
export type PayPalPrice = z.infer<typeof paypalPriceSchema>;
export function paypalEnvironment() { return serverEnv.PAYPAL_ENV; }
function config() {
  const live = serverEnv.PAYPAL_ENV === "live";
  const prefix = live ? "PAYPAL_LIVE" : "PAYPAL_SANDBOX";
  return { live, api: live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    clientId: serverEnv[`${prefix}_CLIENT_ID`], secret: serverEnv[`${prefix}_CLIENT_SECRET`],
    webhookId: serverEnv[`${prefix}_WEBHOOK_ID`], plans: serverEnv[`${prefix}_PLANS`] };
}
export function paypalConfigured(checkout = true) {
  const current = config();
  if (!["sandbox", "live"].includes(serverEnv.PAYPAL_ENV)) return false;
  if (current.live ? process.env.VERCEL_ENV !== "production" : process.env.VERCEL_ENV === "production") return false;
  if (!current.clientId || !current.secret || !current.webhookId) return false;
  // IDs have no documented Sandbox/Live prefix. Detect reuse; OAuth against the
  // selected host provides the authoritative environment check before any POST.
  if (serverEnv.PAYPAL_SANDBOX_CLIENT_ID && serverEnv.PAYPAL_SANDBOX_CLIENT_ID === serverEnv.PAYPAL_LIVE_CLIENT_ID) return false;
  if (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID !== current.clientId) return false;
  if (checkout && (!paypalPrice("PROFESSIONAL_MONTHLY") || (current.live && serverEnv.PAYPAL_LIVE_CHECKOUT_ENABLED !== "true"))) return false;
  return true;
}
export function paypalPrice(code: string): PayPalPrice | null {
  try { const plans = paypalPlansSchema.parse(JSON.parse(config().plans ?? "{}")); return plans[code as keyof typeof plans] ?? null; }
  catch { return null; }
}
export function paypalApiHosts() { return config().live ? ["api.paypal.com", "api-m.paypal.com"] : ["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"]; }
export function paypalApprovalUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== (config().live ? "www.paypal.com" : "www.sandbox.paypal.com") || url.username || url.password || url.port) throw new Error("Invalid PayPal redirect");
  return url.href;
}
export async function paypalApi(path: string, body?: object, requestId?: string): Promise<unknown> {
  if (!paypalConfigured(false)) throw new Error("PayPal unavailable");
  if (body && ["/v1/billing/subscriptions", "/v2/checkout/orders"].includes(path) && !paypalConfigured()) throw new Error("PayPal checkout unavailable");
  const current = config();
  if (!path.startsWith("/v1/") && !path.startsWith("/v2/")) throw new Error("Invalid PayPal path");
  const auth = await fetch(`${current.api}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${current.clientId}:${current.secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!auth.ok) throw new Error("PayPal authentication failed");
  const token = z.object({ access_token: z.string().min(1) }).parse(await auth.json());
  const response = await fetch(`${current.api}${path}`, {
    method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`PayPal request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}
export async function verifyPayPalWebhook(headers: Headers, event: unknown) {
  const fields = ["auth-algo", "cert-url", "transmission-id", "transmission-sig", "transmission-time"];
  if (fields.some(field => !headers.get(`paypal-${field}`))) return false;
  let cert: URL;
  try { cert = new URL(headers.get("paypal-cert-url")!); } catch { return false; }
  if (cert.protocol !== "https:" || !paypalApiHosts().includes(cert.hostname) || !cert.pathname.startsWith("/v1/notifications/certs/") || cert.username || cert.password || cert.port) return false;
  const result = await paypalApi("/v1/notifications/verify-webhook-signature", {
    auth_algo: headers.get("paypal-auth-algo"), cert_url: cert.href,
    transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"), webhook_id: config().webhookId, webhook_event: event,
  });
  return z.object({ verification_status: z.string() }).parse(result).verification_status === "SUCCESS";
}
export async function assertPayPalPlan(price: PayPalPrice) {
  const plan = z.object({ id: paypalId, status: z.literal("ACTIVE"),
    billing_cycles: z.array(z.object({ tenure_type: z.literal("REGULAR"), total_cycles: z.literal(0),
      frequency: z.object({ interval_unit: z.literal("MONTH"), interval_count: z.literal(1) }),
      pricing_scheme: z.object({ fixed_price: money }) })).length(1),
    payment_preferences: z.object({ setup_fee: money.optional(), auto_bill_outstanding: z.boolean() }),
    taxes: z.object({ percentage: z.string() }).optional(), quantity_supported: z.boolean().optional(),
  }).parse(await paypalApi(`/v1/billing/plans/${paypalId.parse(price.planId)}`));
  const fixed = plan.billing_cycles[0]!.pricing_scheme.fixed_price;
  if (plan.id !== price.planId || fixed.currency_code !== price.currency || Number(fixed.value) !== Number(price.amount) ||
    Number(plan.payment_preferences.setup_fee?.value ?? 0) !== 0 || Number(plan.taxes?.percentage ?? 0) !== 0 || plan.quantity_supported || plan.payment_preferences.auto_bill_outstanding) throw new Error("PayPal plan mismatch");
}
const resourceSchema = z.object({ id: paypalId, status: z.string(), links: z.array(z.object({ rel: z.string(), href: z.string() })).default([]) });
export async function createPayPalResource(reference: string, price: PayPalPrice, model: "RECURRING" | "ONE_TIME") {
  const context = { brand_name: "Universo Psi", shipping_preference: "NO_SHIPPING", user_action: model === "RECURRING" ? "SUBSCRIBE_NOW" : "PAY_NOW",
    return_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return#suscripcion`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-canceled#suscripcion` };
  const result = await paypalApi(model === "RECURRING" ? "/v1/billing/subscriptions" : "/v2/checkout/orders",
    model === "RECURRING" ? { plan_id: price.planId, custom_id: reference, application_context: context } :
      { intent: "CAPTURE", purchase_units: [{ custom_id: reference, reference_id: reference, amount: { currency_code: price.currency, value: price.amount } }], payment_source: { paypal: { experience_context: context } } }, reference);
  return resourceSchema.parse(result);
}
export async function fetchPayPalResource(id: string, model: "RECURRING" | "ONE_TIME") {
  return paypalApi(`${model === "RECURRING" ? "/v1/billing/subscriptions" : "/v2/checkout/orders"}/${paypalId.parse(id)}`);
}
export function approvalLink(resource: unknown) {
  const parsed = resourceSchema.parse(resource);
  const link = parsed.links.find(link => link.rel === "approve" || link.rel === "payer-action");
  return link ? paypalApprovalUrl(link.href) : null;
}
