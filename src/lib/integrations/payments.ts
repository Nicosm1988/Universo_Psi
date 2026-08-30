import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

const MERCADO_PAGO_API = "https://api.mercadopago.com";

export type PaymentAvailability = {
  provider: "MERCADO_PAGO";
  configured: boolean;
};

export function paymentAvailability(): PaymentAvailability {
  return {
    provider: "MERCADO_PAGO",
    configured: Boolean(
      serverEnv.MERCADOPAGO_ACCESS_TOKEN && serverEnv.MERCADOPAGO_WEBHOOK_SECRET,
    ),
  };
}

export type CreateSubscriptionCheckoutInput = {
  subscriptionId: string;
  payerEmail: string;
  planName: string;
  amount: number;
  currency: string;
};

export type CreateSubscriptionCheckoutResult = {
  externalSubscriptionId: string;
  initPoint: string;
};

/**
 * Creates a Mercado Pago recurring subscription (Preapproval API) and
 * returns the checkout URL to redirect the professional to. Requires
 * MERCADOPAGO_ACCESS_TOKEN to be configured; throws otherwise so callers
 * never silently proceed without a real integration.
 */
export async function createSubscriptionCheckout(
  input: CreateSubscriptionCheckoutInput,
): Promise<CreateSubscriptionCheckoutResult> {
  if (!serverEnv.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("Mercado Pago is not configured");
  }

  const response = await fetch(`${MERCADO_PAGO_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.subscriptionId,
    },
    body: JSON.stringify({
      reason: `Universo Psi · ${input.planName}`,
      external_reference: input.subscriptionId,
      payer_email: input.payerEmail,
      back_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=checkout-return`,
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

  return { externalSubscriptionId: String(body.id), initPoint: String(body.init_point) };
}

export type MercadoPagoPreapproval = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  externalReference: string | null;
  raw: unknown;
};

/**
 * Fetches the authoritative preapproval state from Mercado Pago. Webhook
 * notifications only carry an id — the payload must never be trusted on
 * its own, so every event triggers this lookup before any reconciliation.
 */
export async function fetchPreapproval(id: string): Promise<MercadoPagoPreapproval> {
  if (!serverEnv.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("Mercado Pago is not configured");
  }

  const response = await fetch(`${MERCADO_PAGO_API}/preapproval/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${serverEnv.MERCADOPAGO_ACCESS_TOKEN}` },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    throw new Error(`Mercado Pago preapproval lookup failed: ${response.status}`);
  }

  return {
    id: String(body.id),
    status: body.status,
    externalReference: body.external_reference ?? null,
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
}): boolean {
  const { signatureHeader, requestId, dataId } = params;
  if (!signatureHeader || !requestId || !serverEnv.MERCADOPAGO_WEBHOOK_SECRET) return false;

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
  const expected = createHmac("sha256", serverEnv.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
