import { NextResponse, type NextRequest } from "next/server";

import {
  MercadoPagoHttpError,
  SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS,
  fetchAuthorizedPayment,
  fetchPreapproval,
  resolvePaymentAccount,
  verifyMercadoPagoSignature,
  type PaymentAccountKey,
} from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Mercado Pago's own "Simulate" button (developer panel) always sends this
// exact placeholder resource id, for every notification type, in every
// account — it does not exist in any real merchant account. A signed
// request for this id that 404s against the real API is a connectivity
// test, not a real event; anything else keeps failing loudly (502).
const MERCADO_PAGO_SIMULATOR_TEST_ID = "123456";

// Each Mercado Pago account (personal / company) is a distinct MP
// application with its own webhook secret, so the account is encoded in
// the URL path — configured once per account in the MP developer panel —
// rather than guessed from the payload. This is what lets both accounts
// coexist and lets a subscription created under "personal" keep
// reconciling correctly against the personal credentials even after
// MERCADOPAGO_ACTIVE_ACCOUNT switches to "company" for new checkouts.
function parseAccount(value: string): PaymentAccountKey | null {
  return value === "personal" || value === "company" ? value : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account: string }> },
) {
  const account = parseAccount((await params).account);
  if (!account || !resolvePaymentAccount(account)) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  let notification: {
    id?: number | string;
    type?: string;
    data?: { id?: string };
    date_created?: string;
  } | null = null;
  try {
    notification = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const dataId = notification?.data?.id;
  if (!dataId || !notification?.type) {
    return NextResponse.json({ ok: false, reason: "malformed_notification" }, { status: 400 });
  }

  const signatureValid = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: String(dataId),
    accountKey: account,
  });
  if (!signatureValid) {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }

  const admin = createAdminClient();
  const occurredAt = notification.date_created ?? new Date().toISOString();
  const externalEventId = String(notification.id ?? `${notification.type}:${dataId}`);

  try {
    if (notification.type === "subscription_preapproval") {
      const preapproval = await fetchPreapproval(String(dataId), account);
      const mappedStatus = SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[preapproval.status];

      const { error } = await admin.rpc("apply_subscription_webhook_event", {
        p_provider_subscription_id: preapproval.id,
        p_external_event_id: externalEventId,
        p_event_type: notification.type,
        p_status: mappedStatus ?? null,
        p_period_start: null,
        p_period_end: null,
        p_next_payment_at: preapproval.nextPaymentDate,
        p_payload: preapproval.raw as object,
        p_occurred_at: occurredAt,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (notification.type === "subscription_authorized_payment") {
      const charge = await fetchAuthorizedPayment(String(dataId), account);
      if (!charge.preapprovalId) {
        return NextResponse.json({ ok: true, ignored: true });
      }

      const { error } = await admin.rpc("apply_subscription_payment_event", {
        p_provider_subscription_id: charge.preapprovalId,
        p_external_event_id: externalEventId,
        p_payment_status: charge.status,
        p_paid_at: charge.dateApproved,
        p_payload: charge.raw as object,
        p_occurred_at: occurredAt,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (notification.type === "payment") {
      // One-time Checkout Pro charges (professional_annual_upfront):
      // fetched directly, not via authorized_payments (that endpoint is
      // Preapproval-only). The preference's external_reference is our
      // subscription id, which doubles as provider_subscription_id for
      // one-time plans (see createCheckoutRedirectUrl).
      const account_ = resolvePaymentAccount(account);
      if (!account_) return NextResponse.json({ ok: false }, { status: 503 });
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(dataId))}`,
        { headers: { Authorization: `Bearer ${account_.accessToken}` } },
      );
      const payment = await response.json().catch(() => null);
      if (!response.ok || !payment?.id || !payment?.external_reference) {
        throw new MercadoPagoHttpError(
          `Mercado Pago payment lookup failed: ${response.status}`,
          response.status,
        );
      }

      const { error } = await admin.rpc("apply_subscription_payment_event", {
        p_provider_subscription_id: String(payment.external_reference),
        p_external_event_id: externalEventId,
        p_payment_status: payment.status,
        p_paid_at: payment.date_approved ?? null,
        p_payload: payment,
        p_occurred_at: occurredAt,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (fetchError) {
    const isSimulatorProbe =
      String(dataId) === MERCADO_PAGO_SIMULATOR_TEST_ID &&
      fetchError instanceof MercadoPagoHttpError &&
      fetchError.status === 404;

    if (isSimulatorProbe) {
      // Signature already verified above; this is Mercado Pago's own test
      // ping, not a real event. Acknowledge connectivity without touching
      // any subscription — activation only ever happens for a real,
      // resolvable resource.
      console.info("synthetic Mercado Pago webhook test received", {
        account,
        type: notification.type,
        externalEventId,
      });
      return NextResponse.json({ ok: true, synthetic: true });
    }

    console.error("Failed to reconcile Mercado Pago webhook event", fetchError);
    return NextResponse.json({ ok: false, reason: "reconciliation_failed" }, { status: 502 });
  }
}
