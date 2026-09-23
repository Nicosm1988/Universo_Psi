import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { paypalConfigured, verifyPayPalWebhook } from "@/lib/integrations/paypal";
import { paypalEventSchema, processPayPalEvent } from "@/lib/subscriptions/paypal";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!paypalConfigured(false)) return NextResponse.json({ ok: false }, { status: 503 });
  let raw: unknown;
  try { raw = await readJsonBody(request, 128 * 1024); }
  catch (error) { return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
  const event = paypalEventSchema.safeParse(raw);
  if (!event.success) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    if (!await verifyPayPalWebhook(request.headers, raw)) return NextResponse.json({ ok: false }, { status: 401 });
    await processPayPalEvent(event.data);
    return NextResponse.json({ ok: true });
  } catch {
    // Deliberately no payload, payer details, tokens, or provider error bodies.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
