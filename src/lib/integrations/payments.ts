import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

const MERCADO_PAGO_API = "https://api.mercadopago.com";

/**
 * Thrown by the fetch* lookups below when Mercado Pago responds with a
 * specific HTTP status, so callers can react to "resource not found" (404)
 * differently from a real upstream failure — needed to recognize Mercado
 * Pago's official webhook simulator, which always sends the fixed
 * placeholder id "123456" that does not exist in any real account.
 */
export class MercadoPagoHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MercadoPagoHttpError";
    this.status = status;
  }
}

/**
 * A "payment account" is one Mercado Pago application/merchant account
 * (credentials + webhook secret). Today only "personal" is configured
 * (the founder's account, used for sandbox testing); "company" exists so
 * the eventual move to the incorporated entity's MP account is a config
 * change (MERCADOPAGO_ACTIVE_ACCOUNT + the COMPANY_* env vars) — never a
 * code change, and never touches subscriptions already created under
 * "personal". Every subscription row permanently records which account
 * created it (provider_account) so reconciliation always uses the right
 * credentials, independent of whichever account is "active" today.
 */
export type PaymentAccountKey = "personal" | "company";

type PaymentAccountCredentials = {
  key: PaymentAccountKey;
  accessToken: string;
  publicKey: string | undefined;
  webhookSecret: string;
};

const ACCOUNT_CREDENTIALS: Record<
  PaymentAccountKey,
  { accessToken?: string; publicKey?: string; webhookSecret?: string }
> = {
  personal: {
    accessToken: serverEnv.MERCADOPAGO_PERSONAL_ACCESS_TOKEN,
    publicKey: serverEnv.MERCADOPAGO_PERSONAL_PUBLIC_KEY,
    webhookSecret: serverEnv.MERCADOPAGO_PERSONAL_WEBHOOK_SECRET,
  },
  company: {
    accessToken: serverEnv.MERCADOPAGO_COMPANY_ACCESS_TOKEN,
    publicKey: serverEnv.MERCADOPAGO_COMPANY_PUBLIC_KEY,
    webhookSecret: serverEnv.MERCADOPAGO_COMPANY_WEBHOOK_SECRET,
  },
};

export function activePaymentAccountKey(): PaymentAccountKey {
  return serverEnv.MERCADOPAGO_ACTIVE_ACCOUNT;
}

/** Returns the resolved credentials for an account, or null if not configured. */
export function resolvePaymentAccount(
  key: PaymentAccountKey = activePaymentAccountKey(),
): PaymentAccountCredentials | null {
  const creds = ACCOUNT_CREDENTIALS[key];
  if (!creds.accessToken || !creds.webhookSecret) return null;
  return { key, accessToken: creds.accessToken, publicKey: creds.publicKey, webhookSecret: creds.webhookSecret };
}

export type PaymentAvailability = {
  provider: "MERCADO_PAGO";
  account: PaymentAccountKey;
  configured: boolean;
};

export function paymentAvailability(
  accountKey: PaymentAccountKey = activePaymentAccountKey(),
): PaymentAvailability {
  return {
    provider: "MERCADO_PAGO",
    account: accountKey,
    configured: resolvePaymentAccount(accountKey) !== null,
  };
}

function requireAccount(accountKey: PaymentAccountKey): PaymentAccountCredentials {
  const account = resolvePaymentAccount(accountKey);
  if (!account) throw new Error(`Mercado Pago account "${accountKey}" is not configured`);
  return account;
}

export type CreateSubscriptionCheckoutInput = {
  subscriptionId: string;
  payerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  accountKey?: PaymentAccountKey;
  /** MP-side preapproval_plan_id, when the internal plan is mapped to one. */
  providerPlanId?: string | null;
};

export type CreateSubscriptionCheckoutResult = {
  accountKey: PaymentAccountKey;
  providerSubscriptionId: string;
  initPoint: string;
};

/**
 * Creates a Mercado Pago recurring subscription (Preapproval API) and
 * returns the checkout URL to redirect the professional to.
 */
export async function createSubscriptionCheckout(
  input: CreateSubscriptionCheckoutInput,
): Promise<CreateSubscriptionCheckoutResult> {
  const accountKey = input.accountKey ?? activePaymentAccountKey();
  const account = requireAccount(accountKey);

  const response = await fetch(`${MERCADO_PAGO_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.subscriptionId,
    },
    body: JSON.stringify({
      reason: `Universo Psi · ${input.planName}`,
      external_reference: input.subscriptionId,
      payer_email: input.payerEmail,
      back_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`,
      ...(input.providerPlanId ? { preapproval_plan_id: input.providerPlanId } : {}),
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: input.currency,
      },
      status: "pending",
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id || !body?.init_point) {
    throw new Error(
      `Mercado Pago preapproval creation failed: ${response.status} ${JSON.stringify(body)}`,
    );
  }

  return {
    accountKey,
    providerSubscriptionId: String(body.id),
    initPoint: String(body.init_point),
  };
}

export type CreateOneTimeCheckoutInput = {
  subscriptionId: string;
  payerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  accountKey?: PaymentAccountKey;
};

export type CreateOneTimeCheckoutResult = {
  accountKey: PaymentAccountKey;
  providerSubscriptionId: string;
  initPoint: string;
};

/**
 * Creates a one-time Mercado Pago charge (Checkout Pro preference) for
 * plans billed as a single upfront payment (e.g. professional_annual_upfront)
 * rather than a recurring subscription. Kept as a distinct function from
 * createSubscriptionCheckout because it is a different MP product
 * (preferences, not preapproval) with a different lifecycle: there is no
 * ongoing "subscription" resource to reconcile, just a single payment.
 */
export async function createOneTimeCheckout(
  input: CreateOneTimeCheckoutInput,
): Promise<CreateOneTimeCheckoutResult> {
  const accountKey = input.accountKey ?? activePaymentAccountKey();
  const account = requireAccount(accountKey);

  const response = await fetch(`${MERCADO_PAGO_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.subscriptionId,
    },
    body: JSON.stringify({
      items: [
        {
          title: `Universo Psi · ${input.planName}`,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.subscriptionId,
      back_urls: {
        success: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`,
        pending: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-pending`,
        failure: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-failure`,
      },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id || !body?.init_point) {
    throw new Error(
      `Mercado Pago preference creation failed: ${response.status} ${JSON.stringify(body)}`,
    );
  }

  return {
    accountKey,
    providerSubscriptionId: String(body.id),
    initPoint: String(body.init_point),
  };
}

export type MercadoPagoPreapproval = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  externalReference: string | null;
  nextPaymentDate: string | null;
  raw: unknown;
};

/**
 * Fetches the authoritative preapproval state from Mercado Pago. Webhook
 * notifications only carry an id — the payload must never be trusted on
 * its own, so every event triggers this lookup before any reconciliation.
 */
export async function fetchPreapproval(
  id: string,
  accountKey: PaymentAccountKey = activePaymentAccountKey(),
): Promise<MercadoPagoPreapproval> {
  const account = requireAccount(accountKey);

  const response = await fetch(`${MERCADO_PAGO_API}/preapproval/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    throw new MercadoPagoHttpError(
      `Mercado Pago preapproval lookup failed: ${response.status}`,
      response.status,
    );
  }

  return {
    id: String(body.id),
    status: body.status,
    externalReference: body.external_reference ?? null,
    nextPaymentDate: body.auto_recurring?.next_payment_date ?? null,
    raw: body,
  };
}

export type MercadoPagoAuthorizedPayment = {
  id: string;
  status: "approved" | "pending" | "rejected" | "cancelled" | "refunded" | string;
  preapprovalId: string | null;
  dateApproved: string | null;
  raw: unknown;
};

/** Fetches a single recurring charge (subscription_authorized_payment event). */
export async function fetchAuthorizedPayment(
  id: string,
  accountKey: PaymentAccountKey = activePaymentAccountKey(),
): Promise<MercadoPagoAuthorizedPayment> {
  const account = requireAccount(accountKey);

  const response = await fetch(
    `${MERCADO_PAGO_API}/authorized_payments/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    throw new MercadoPagoHttpError(
      `Mercado Pago authorized payment lookup failed: ${response.status}`,
      response.status,
    );
  }

  return {
    id: String(body.id),
    status: body.status,
    preapprovalId: body.preapproval_id ? String(body.preapproval_id) : null,
    dateApproved: body.date_approved ?? null,
    raw: body,
  };
}

export const SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS: Record<
  MercadoPagoPreapproval["status"],
  "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "CANCELED"
> = {
  pending: "PENDING_PAYMENT",
  authorized: "ACTIVE",
  paused: "PAUSED",
  cancelled: "CANCELED",
};

/**
 * Verifies Mercado Pago's `x-signature` header per their documented
 * manifest scheme: HMAC-SHA256("id:{dataId};request-id:{requestId};ts:{ts};",
 * webhookSecret), compared in constant time. Returns false (never throws)
 * on any malformed input so callers can fail closed uniformly.
 *
 * IMPORTANT: this has not been exercised against a real Mercado Pago
 * notification yet (no sandbox credentials were available while writing
 * it). Verify it against an actual webhook call in sandbox before relying
 * on it in production — a subtly wrong manifest format here would either
 * reject every legitimate event or, worse, accept forged ones.
 */
export function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
  accountKey: PaymentAccountKey;
}): boolean {
  const { signatureHeader, requestId, dataId, accountKey } = params;
  const account = resolvePaymentAccount(accountKey);
  if (!signatureHeader || !requestId || !account) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=").map((s) => s.trim());
      return [key, value];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", account.webhookSecret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
