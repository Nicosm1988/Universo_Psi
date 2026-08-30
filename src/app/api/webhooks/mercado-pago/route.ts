import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!serverEnv.MERCADOPAGO_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  await request.text();

  // Fail closed until the merchant account supplies a sandbox contract and
  // Mercado Pago's complete manifest-signature verification is implemented.
  // Never acknowledge an event before durable reconciliation is available.
  return NextResponse.json({ ok: false, reason: "reconciliation_not_configured" }, { status: 503 });
}
