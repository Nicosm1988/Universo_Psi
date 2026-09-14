import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

const API = "https://api.mercadopago.com";
const resourceId = z.union([z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/), z.number().int().nonnegative().safe()]).transform(String);
const timestamp = z.string().datetime({ offset: true });
const amountSchema = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number).pipe(z.number().positive().finite());
const checkoutUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && ["www.mercadopago.com.ar", "sandbox.mercadopago.com.ar", "www.mercadopago.com", "sandbox.mercadopago.com"].includes(url.hostname) && !url.username && !url.password;
});

export class MercadoPagoHttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "MercadoPagoHttpError";
  }
}

export type PaymentAccountKey = "personal" | "company";
type PaymentAccountCredentials = {
  key: PaymentAccountKey;
  accessToken: string;
  publicKey: string | undefined;
  webhookSecret: string;
  collectorId: string;
  environment: "sandbox" | "production";
};

export function activePaymentAccountKey(): PaymentAccountKey {
  return serverEnv.MERCADOPAGO_ACTIVE_ACCOUNT;
}

export function resolvePaymentAccount(key: PaymentAccountKey = activePaymentAccountKey()): PaymentAccountCredentials | null {
  const prefix = key === "personal" ? "MERCADOPAGO_PERSONAL" : "MERCADOPAGO_COMPANY";
  const accessToken = serverEnv[`${prefix}_ACCESS_TOKEN`];
  const webhookSecret = serverEnv[`${prefix}_WEBHOOK_SECRET`];
  const collectorId = serverEnv[`${prefix}_COLLECTOR_ID`];
  const environment = serverEnv[`${prefix}_ENVIRONMENT`];
  if (!accessToken || !webhookSecret || !collectorId || !environment) return null;
  return { key, accessToken, webhookSecret, collectorId, environment, publicKey: serverEnv[`${prefix}_PUBLIC_KEY`] };
}

export type PaymentAvailability = { provider: "MERCADO_PAGO"; account: PaymentAccountKey; configured: boolean };
export function paymentAvailability(accountKey: PaymentAccountKey = activePaymentAccountKey()): PaymentAvailability {
  return { provider: "MERCADO_PAGO", account: accountKey, configured: serverEnv.MERCADOPAGO_CHECKOUT_ENABLED === "true" && resolvePaymentAccount(accountKey) !== null };
}

function requireAccount(key: PaymentAccountKey) {
  const account = resolvePaymentAccount(key);
  if (!account) throw new Error("Mercado Pago account not configured");
  return account;
}

async function providerRequest(path: string, key: PaymentAccountKey, body?: object, method?: "PUT"): Promise<unknown> {
  const account = requireAccount(key);
  const response = await fetch(`${API}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${account.accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  // Never include provider response bodies: they can contain payer/card data.
  if (!response.ok) throw new MercadoPagoHttpError("Mercado Pago request failed", response.status);
  return response.json();
}

/** Preapproval has no documented live_mode. Verify the credential owner before creating or reading it. */
export async function verifyPaymentAccountIdentity(key: PaymentAccountKey): Promise<void> {
  const account = requireAccount(key);
  const owner = z.object({ id: resourceId, tags: z.array(z.string()) }).parse(await providerRequest("/users/me", key));
  const testUser = owner.tags.includes("test_user");
  if (owner.id !== account.collectorId || testUser !== (account.environment === "sandbox")) {
    throw new Error("Mercado Pago account identity/environment mismatch");
  }
}

function assertCollector(collectorId: string, key: PaymentAccountKey) {
  if (collectorId !== requireAccount(key).collectorId) throw new Error("Mercado Pago collector mismatch");
}

const preapprovalSchema = z.object({
  id: resourceId, collector_id: resourceId,
  // The update-preapproval reference uses "canceled"; normalize both provider
  // spellings so reconciliation and event deduplication retain one canonical state.
  status: z.enum(["pending", "authorized", "paused", "cancelled", "canceled"])
    .transform((status) => status === "canceled" ? "cancelled" as const : status),
  external_reference: z.uuid(),
  // Lifecycle resources (for example a cancelled preapproval) may omit checkout.
  // Redirects still require a safe URL via assertCheckoutMatches below.
  init_point: checkoutUrl.nullish(),
  last_modified: timestamp,
  next_payment_date: timestamp.nullish(),
  auto_recurring: z.object({ transaction_amount: amountSchema, currency_id: z.string().length(3), frequency: z.literal(1), frequency_type: z.literal("months") }),
});
export type MercadoPagoPreapproval = {
  id: string; status: "pending" | "authorized" | "paused" | "cancelled";
  externalReference: string; nextPaymentDate: string | null; modifiedAt: string;
  amount: number; currency: string; initPoint: string | null;
};
function parsePreapproval(body: unknown, key: PaymentAccountKey): MercadoPagoPreapproval {
  const value = preapprovalSchema.parse(body);
  assertCollector(value.collector_id, key);
  return { id: value.id, status: value.status, externalReference: value.external_reference,
    nextPaymentDate: value.next_payment_date ?? null, modifiedAt: value.last_modified,
    amount: value.auto_recurring.transaction_amount, currency: value.auto_recurring.currency_id, initPoint: value.init_point ?? null };
}
export async function fetchPreapproval(id: string, key: PaymentAccountKey = activePaymentAccountKey()): Promise<MercadoPagoPreapproval> {
  const value = parsePreapproval(await providerRequest(`/preapproval/${encodeURIComponent(id)}`, key), key);
  if (value.id !== id) throw new Error("Mercado Pago resource mismatch");
  return value;
}

export type CreateSubscriptionCheckoutInput = {
  subscriptionId: string; payerEmail: string; planName: string; amount: number; currency: string;
  accountKey?: PaymentAccountKey; providerPlanId?: string | null;
};
export type CreateSubscriptionCheckoutResult = { accountKey: PaymentAccountKey; providerSubscriptionId: string; initPoint: string };
export async function createSubscriptionCheckout(input: CreateSubscriptionCheckoutInput): Promise<CreateSubscriptionCheckoutResult> {
  const key = input.accountKey ?? activePaymentAccountKey();
  const value = parsePreapproval(await providerRequest("/preapproval", key, {
    reason: `Universo Psi · ${input.planName}`, external_reference: input.subscriptionId,
    payer_email: input.payerEmail, back_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`,
    ...(input.providerPlanId ? { preapproval_plan_id: input.providerPlanId } : {}),
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.amount, currency_id: input.currency },
    status: "pending",
  }), key);
  assertCheckoutMatches(value, input);
  return { accountKey: key, providerSubscriptionId: value.id, initPoint: value.initPoint };
}

export function assertCheckoutMatches(value: MercadoPagoPreapproval, input: Pick<CreateSubscriptionCheckoutInput, "subscriptionId" | "amount" | "currency">, allowAuthorized = false): asserts value is MercadoPagoPreapproval & { initPoint: string } {
  if (!value.initPoint || value.externalReference !== input.subscriptionId || value.amount !== input.amount || value.currency !== input.currency || (value.status !== "pending" && !(allowAuthorized && value.status === "authorized"))) {
    throw new Error("Mercado Pago checkout does not match selection");
  }
}

/** Recovery after a lost response/link failure; callers must never repeat an uncertain POST. */
export async function findSubscriptionCheckout(subscriptionId: string, key: PaymentAccountKey): Promise<MercadoPagoPreapproval | null> {
  const query = new URLSearchParams({ external_reference: subscriptionId, limit: "100" });
  const body = z.object({ results: z.array(z.unknown()), paging: z.object({ total: z.number() }) }).parse(
    await providerRequest(`/preapproval/search?${query}`, key),
  );
  if (body.paging.total > body.results.length) throw new Error("Mercado Pago recovery search incomplete");
  const matches = body.results.map((row) => parsePreapproval(row, key)).filter((row) => row.externalReference === subscriptionId);
  if (matches.length > 1) throw new Error("Mercado Pago duplicate checkout requires reconciliation");
  return matches[0] ?? null;
}

export type CreateOneTimeCheckoutInput = Omit<CreateSubscriptionCheckoutInput, "providerPlanId" | "payerEmail">;
export type CreateOneTimeCheckoutResult = CreateSubscriptionCheckoutResult;
export async function createOneTimeCheckout(input: CreateOneTimeCheckoutInput): Promise<CreateOneTimeCheckoutResult> {
  const key = input.accountKey ?? activePaymentAccountKey();
  const body = await providerRequest("/checkout/preferences", key, {
    items: [{ title: `Universo Psi · ${input.planName}`, quantity: 1, unit_price: input.amount, currency_id: input.currency }],
    external_reference: input.subscriptionId,
    notification_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercado-pago/${key}`,
    back_urls: { success: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`, pending: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-pending`, failure: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-failure` },
  });
  return parseOneTimeCheckout(body, input, key);
}

const preferenceSchema = z.object({
  id: resourceId, collector_id: resourceId, external_reference: z.uuid(),
  init_point: checkoutUrl, sandbox_init_point: checkoutUrl,
  items: z.array(z.object({ quantity: z.number().int().positive(), unit_price: amountSchema, currency_id: z.string().length(3) })).length(1),
});
function parseOneTimeCheckout(body: unknown, input: CreateOneTimeCheckoutInput, key: PaymentAccountKey): CreateOneTimeCheckoutResult {
  const value = preferenceSchema.parse(body);
  assertCollector(value.collector_id, key);
  const item = value.items[0];
  if (!item || value.external_reference !== input.subscriptionId || item.quantity !== 1 || item.unit_price !== input.amount || item.currency_id !== input.currency) throw new Error("Mercado Pago preference mismatch");
  return { accountKey: key, providerSubscriptionId: value.id, initPoint: requireAccount(key).environment === "sandbox" ? value.sandbox_init_point : value.init_point };
}

export async function findOneTimeCheckout(input: CreateOneTimeCheckoutInput, preferenceId?: string | null): Promise<CreateOneTimeCheckoutResult | null> {
  const key = input.accountKey ?? activePaymentAccountKey();
  let id = preferenceId;
  if (!id) {
    const query = new URLSearchParams({ external_reference: input.subscriptionId, limit: "100" });
    const search = z.object({ elements: z.array(z.object({ id: resourceId })), total: z.number().int().nonnegative() }).parse(await providerRequest(`/checkout/preferences/search?${query}`, key));
    // Search covers 90 days. An ambiguous/absent result never authorizes a new POST.
    if (search.total > 1 || search.total !== search.elements.length) throw new Error("Mercado Pago preference recovery ambiguous");
    id = search.elements[0]?.id;
  }
  if (!id) return null;
  const checkout = parseOneTimeCheckout(await providerRequest(`/checkout/preferences/${encodeURIComponent(id)}`, key), input, key);
  if (checkout.providerSubscriptionId !== id) throw new Error("Mercado Pago preference identity mismatch");
  return checkout;
}

const paymentSchema = z.object({
  id: resourceId, collector_id: resourceId, external_reference: z.uuid(),
  live_mode: z.boolean(), status: z.enum(["approved", "pending", "in_process", "authorized", "rejected", "cancelled", "refunded", "charged_back", "in_mediation"]),
  transaction_amount: amountSchema, currency_id: z.string().length(3),
  date_approved: timestamp.nullish(), date_created: timestamp, date_last_updated: timestamp,
});
export type MercadoPagoPayment = {
  id: string; status: string; externalReference: string; amount: number; currency: string;
  dateApproved: string | null; createdAt: string; modifiedAt: string;
};
async function readPayment(id: string, key: PaymentAccountKey) {
  const body = paymentSchema.parse(await providerRequest(`/v1/payments/${encodeURIComponent(id)}`, key));
  assertCollector(body.collector_id, key);
  if (body.id !== id) throw new Error("Mercado Pago payment identity mismatch");
  if (body.status === "approved" && !body.date_approved) throw new Error("Mercado Pago approval date missing");
  return body;
}
function paymentDTO(body: z.infer<typeof paymentSchema>): MercadoPagoPayment {
  return { id: body.id, status: body.status, externalReference: body.external_reference, amount: body.transaction_amount, currency: body.currency_id, dateApproved: body.date_approved ?? null, createdAt: body.date_created, modifiedAt: body.date_last_updated };
}
export async function fetchPayment(id: string, key: PaymentAccountKey): Promise<MercadoPagoPayment> {
  const body = await readPayment(id, key);
  if (body.live_mode !== (requireAccount(key).environment === "production")) throw new Error("Mercado Pago payment identity/environment mismatch");
  return paymentDTO(body);
}

/** Discovery only: this reference cannot authorize a payment or relax fetchPayment.
 * The selected model must subsequently verify its complete payment contract.
 */
export async function fetchPaymentSubscriptionReference(id: string, key: PaymentAccountKey): Promise<string> {
  await verifyPaymentAccountIdentity(key);
  return (await readPayment(id, key)).external_reference;
}

/** Locate exactly one invoice in the persisted preapproval's complete history.
 * Search rows are discovery hints; callers must re-fetch the invoice/payment chain.
 */
export async function findRecurringInvoiceForPayment(input: { paymentId: string; preapprovalId: string; subscriptionId: string; account: PaymentAccountKey }): Promise<string> {
  const pageSchema = z.object({
    paging: z.object({ offset: z.number().int().nonnegative(), limit: z.number().int().positive().max(1000), total: z.number().int().nonnegative() }),
    results: z.array(z.object({ id: resourceId, preapproval_id: resourceId, external_reference: z.uuid(), payment: z.object({ id: resourceId.nullish() }).nullish() })),
  });
  const seen = new Set<string>();
  let match: string | null = null;
  let expectedTotal: number | null = null;
  for (let offset = 0; offset < 1000;) {
    const query = new URLSearchParams({ preapproval_id: input.preapprovalId });
    if (offset > 0) query.set("offset", String(offset));
    const page = pageSchema.parse(await providerRequest(`/authorized_payments/search?${query}`, input.account));
    const { paging, results } = page;
    if (paging.offset !== offset || results.length > paging.limit || offset + results.length > paging.total || paging.total > 1000 || (expectedTotal !== null && paging.total !== expectedTotal)) {
      throw new Error("Recurring invoice search incomplete");
    }
    expectedTotal = paging.total;
    for (const invoice of results) {
      if (invoice.preapproval_id !== input.preapprovalId || invoice.external_reference !== input.subscriptionId || seen.has(invoice.id)) {
        throw new Error("Recurring invoice search mismatch or unstable pagination");
      }
      seen.add(invoice.id);
      if (invoice.payment?.id === input.paymentId) {
        if (match) throw new Error("Recurring invoice search ambiguous");
        match = invoice.id;
      }
    }
    if (offset + results.length >= paging.total) {
      if (!match) throw new Error("Recurring payment invoice not found");
      return match;
    }
    if (results.length !== paging.limit) throw new Error("Recurring invoice search incomplete");
    offset += paging.limit;
  }
  throw new Error("Recurring invoice search incomplete");
}

export type MercadoPagoAuthorizedPayment = { id: string; preapprovalId: string; externalReference: string; amount: number; currency: string; paymentId: string | null; type?: string };
export async function fetchAuthorizedPayment(id: string, key: PaymentAccountKey = activePaymentAccountKey()): Promise<MercadoPagoAuthorizedPayment> {
  const body = z.object({ id: resourceId, type: z.string().optional(), preapproval_id: resourceId, external_reference: z.uuid(), transaction_amount: amountSchema, currency_id: z.string().length(3), payment: z.object({ id: resourceId.nullish() }).nullish() }).parse(await providerRequest(`/authorized_payments/${encodeURIComponent(id)}`, key));
  if (body.id !== id) throw new Error("Mercado Pago invoice mismatch");
  return { id: body.id, preapprovalId: body.preapproval_id, externalReference: body.external_reference, amount: body.transaction_amount, currency: body.currency_id, paymentId: body.payment?.id ?? null, type: body.type };
}

/** Subscription tests use production credentials of a TEST seller (MP testing guide).
 * Such recurring payments have been observed with live_mode=true. Accept that shape
 * only after freshly verifying the credential owner and every authenticated resource
 * in the invoice -> preapproval/payment chain. This is not a generic payment bypass.
 */
export async function fetchRecurringPayment(id: string, key: PaymentAccountKey): Promise<{ preapproval: MercadoPagoPreapproval; payment: MercadoPagoPayment } | null> {
  await verifyPaymentAccountIdentity(key);
  const invoice = await fetchAuthorizedPayment(id, key);
  if (!invoice.paymentId) return null;
  const [preapproval, body] = await Promise.all([
    fetchPreapproval(invoice.preapprovalId, key), readPayment(invoice.paymentId, key),
  ]);
  const payment = paymentDTO(body);
  if (invoice.externalReference !== preapproval.externalReference || payment.externalReference !== preapproval.externalReference || invoice.amount !== payment.amount || preapproval.amount !== payment.amount || invoice.currency !== payment.currency || preapproval.currency !== payment.currency) {
    throw new Error("Recurring payment does not match subscription");
  }
  const production = requireAccount(key).environment === "production";
  if (body.live_mode !== production && (production || invoice.type !== "recurring")) {
    throw new Error("Mercado Pago recurring payment environment mismatch");
  }
  return { preapproval, payment };
}

// Consent is not a payment, and a pending consent must not regress a paid subscription.
export const SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS = {
  pending: null, authorized: null, paused: "PAUSED", cancelled: "CANCELED",
} as const;

/** The signature signs the URL data.id, request id and timestamp, NOT notification metadata.
 * MP retries beyond 15 minutes without a documented maximum or timestamp renewal guarantee.
 * Accept historical signed deliveries; replay cannot mutate state twice because reconciliation
 * uses the fetched resource's version and the transactional account/resource deduplication key.
 */
export function verifyMercadoPagoSignature(params: { signatureHeader: string | null; requestId: string | null; dataId: string; accountKey: PaymentAccountKey }): boolean {
  const { signatureHeader, requestId, dataId, accountKey } = params;
  const account = resolvePaymentAccount(accountKey);
  if (!signatureHeader || !requestId || !account || !/^[a-zA-Z0-9_-]{1,200}$/.test(dataId) || !/^[a-zA-Z0-9_-]{1,200}$/.test(requestId)) return false;
  const fields = signatureHeader.split(",").map((part) => part.trim().split("="));
  if (fields.length !== 2 || fields.some((part) => part.length !== 2) || new Set(fields.map(([key]) => key)).size !== 2) return false;
  const { ts, v1 } = Object.fromEntries(fields);
  if (!/^\d{10}(\d{3})?$/.test(ts ?? "") || !/^[a-fA-F0-9]{64}$/.test(v1 ?? "")) return false;
  const milliseconds = Number(ts) * (ts.length === 10 ? 1000 : 1);
  if (milliseconds > Date.now() + 5 * 60_000) return false;
  const expected = createHmac("sha256", account.webhookSecret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}

/** Card data is tokenized in Mercado Pago's hosted fields. This endpoint creates
 * consent for recurring billing; it does not establish that an installment paid. */
export async function createCardSubscription(
  input: CreateSubscriptionCheckoutInput & { cardTokenId: string },
): Promise<MercadoPagoPreapproval> {
  const key = input.accountKey ?? activePaymentAccountKey();
  const value = parsePreapproval(await providerRequest("/preapproval", key, {
    reason: `Universo Psi · ${input.planName}`,
    external_reference: input.subscriptionId,
    payer_email: input.payerEmail,
    card_token_id: input.cardTokenId,
    back_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`,
    ...(input.providerPlanId ? { preapproval_plan_id: input.providerPlanId } : {}),
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.amount, currency_id: input.currency },
    status: "authorized",
  }), key);
  if (value.externalReference !== input.subscriptionId || value.amount !== input.amount || value.currency !== input.currency || value.status !== "authorized") {
    throw new Error("Mercado Pago card subscription mismatch");
  }
  return value;
}

/** Explicit user recovery of a legacy checkout which has not been authorized. */
export async function cancelPendingPreapproval(id: string, key: PaymentAccountKey) {
  const before = await fetchPreapproval(id, key);
  if (before.status !== "pending" && before.status !== "cancelled") throw new Error("Only pending checkout can be replaced");
  const query = new URLSearchParams({ preapproval_id: id, limit: "1" });
  const invoices = z.object({ paging: z.object({ total: z.number().int().nonnegative() }), results: z.array(z.unknown()) })
    .parse(await providerRequest(`/authorized_payments/search?${query}`, key));
  if (invoices.paging.total !== 0 || invoices.results.length !== 0) throw new Error("Checkout has billing history and cannot be replaced");
  if (before.status === "cancelled") return before;
  await providerRequest(`/preapproval/${encodeURIComponent(id)}`, key, { status: "canceled" }, "PUT");
  const after = await fetchPreapproval(id, key);
  if (after.status !== "cancelled" || after.externalReference !== before.externalReference) throw new Error("Checkout cancellation not confirmed");
  return after;
}
