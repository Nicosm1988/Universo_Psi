import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { isSameOrigin } from "@/lib/http/origin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashIdentifier } from "@/lib/http/request";
import { TERMS_VERSION } from "@/lib/legal";
import { startPayPalCheckout } from "@/lib/subscriptions/paypal";
import { paypalConfigured } from "@/lib/integrations/paypal";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!paypalConfigured()) return NextResponse.json({ ok: false, message: "PayPal no está disponible por el momento. Podés continuar con Mercado Pago." }, { status: 503 });
  let body: unknown;
  try { body = await readJsonBody(request, 4096); }
  catch (error) { return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
  const input = z.object({ subscriptionId: z.uuid() }).strict().safeParse(body);
  if (!input.success) return NextResponse.json({ ok: false }, { status: 422 });
  const client = await createClient();
  const { data: claims, error } = await client.auth.getClaims();
  if (error || !claims?.claims?.sub) return NextResponse.json({ ok: false }, { status: 401 });
  const [{ data: profile }, { data: legal }] = await Promise.all([
    client.rpc("my_professional_profile").select("id").maybeSingle(),
    client.from("user_profiles").select("terms_version").eq("id", claims.claims.sub).maybeSingle(),
  ]);
  if (!profile) return NextResponse.json({ ok: false }, { status: 403 });
  if (legal?.terms_version !== TERMS_VERSION) return NextResponse.json({ ok: false }, { status: 428 });
  const limit = await consumeRateLimit(createAdminClient(), { scope: "subscription.paypal.user", keyHash: hashIdentifier(String(claims.claims.sub)), limit: 6, windowSeconds: 600 });
  if (!limit.allowed) return NextResponse.json({ ok: false, message: "Esperá unos minutos antes de reintentar." }, { status: limit.unavailable ? 503 : 429 });
  try {
    const redirectUrl = await startPayPalCheckout(client, input.data.subscriptionId, profile.id);
    return NextResponse.json({ ok: true, redirectUrl: redirectUrl ?? "/dashboard?subscription=checkout-return#suscripcion" });
  } catch {
    return NextResponse.json({ ok: false, message: "No pudimos abrir PayPal. Volvé a intentar. Si el problema continúa, contactanos para revisar la operación pendiente." }, { status: 409 });
  }
}
