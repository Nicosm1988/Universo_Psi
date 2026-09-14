import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { resolvePaymentAccount, verifyMercadoPagoSignature } from "@/lib/integrations/payments";
import { reconcileAuthorizedPayment, reconcilePaymentNotification, reconcilePreapproval, reconciliationFailureDetails } from "@/lib/subscriptions/reconcile";

export const runtime = "nodejs";
const dataIdSchema = z.union([z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/), z.number().int().safe().nonnegative()]).transform(String);
const notificationSchema = z.object({ type: z.string().min(1).max(100), data: z.object({ id: dataIdSchema }) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ account: string }> }) {
  const parsedAccount = z.enum(["personal", "company"]).safeParse((await params).account);
  if (!parsedAccount.success || !resolvePaymentAccount(parsedAccount.data)) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  const account = parsedAccount.data;
  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }
  const notification = notificationSchema.safeParse(body);
  const ids = request.nextUrl.searchParams.getAll("data.id");
  const queryId = dataIdSchema.safeParse(ids[0]);
  if (!notification.success || ids.length !== 1 || !queryId.success || queryId.data.toLowerCase() !== notification.data.data.id.toLowerCase()) {
    return NextResponse.json({ ok: false, reason: "malformed_notification" }, { status: 400 });
  }
  if (!verifyMercadoPagoSignature({ signatureHeader: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: queryId.data, accountKey: account })) {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }
  // Notification id, timestamps, user_id and live_mode are unsigned metadata.
  // State, deduplication and commercial linkage come only from authenticated API reads.
  try {
    switch (notification.data.type) {
      case "subscription_preapproval": await reconcilePreapproval(queryId.data, account); break;
      case "subscription_authorized_payment": await reconcileAuthorizedPayment(queryId.data, account); break;
      case "payment": await reconcilePaymentNotification(queryId.data, account); break;
      default: return NextResponse.json({ ok: true, ignored: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("mercado_pago_reconciliation_failed", { account, type: notification.data.type, ...reconciliationFailureDetails(error) });
    // Even simulator 404s stay failures: connectivity is not evidence of a payment.
    return NextResponse.json({ ok: false, reason: "reconciliation_failed" }, { status: 502 });
  }
}
