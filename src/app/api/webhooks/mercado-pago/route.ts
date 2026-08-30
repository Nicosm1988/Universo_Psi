import { NextResponse, type NextRequest } from "next/server";

import {
  SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS,
  fetchPreapproval,
  verifyMercadoPagoSignature,
} from "@/lib/integrations/payments";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!serverEnv.MERCADOPAGO_WEBHOOK_SECRET || !serverEnv.MERCADOPAGO_ACCESS_TOKEN) {
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
  });
  if (!signatureValid) {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }

  // Only preapproval (subscription) lifecycle events are handled today.
  // Per-charge authorized_payment events can be added once the core
  // activate/deactivate gate has been verified in sandbox.
  if (notification.type !== "subscription_preapproval") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const preapproval = await fetchPreapproval(String(dataId));
    const mappedStatus = SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[preapproval.status];

    const admin = createAdminClient();
    const { error } = await admin.rpc("apply_subscription_webhook_event", {
      p_external_subscription_id: preapproval.id,
      p_external_event_id: String(notification.id ?? `${preapproval.id}:${preapproval.status}`),
      p_event_type: notification.type,
      p_status: mappedStatus ?? null,
      p_period_start: null,
      p_period_end: null,
      p_payload: preapproval.raw as object,
      p_occurred_at: notification.date_created ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to apply Mercado Pago webhook event", error);
      return NextResponse.json({ ok: false, reason: "reconciliation_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (fetchError) {
    console.error("Failed to fetch Mercado Pago preapproval", fetchError);
    return NextResponse.json({ ok: false, reason: "upstream_lookup_failed" }, { status: 502 });
  }
}
