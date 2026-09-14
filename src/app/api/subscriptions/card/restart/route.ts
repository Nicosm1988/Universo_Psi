import { NextResponse, type NextRequest } from "next/server";

import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { isSameOrigin } from "@/lib/http/origin";
import { hashIdentifier, requestFingerprint } from "@/lib/http/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { TERMS_VERSION } from "@/lib/legal";
import { restartPendingCardCheckout } from "@/lib/subscriptions/checkout";
import { checkoutFailure } from "@/lib/subscriptions/checkout-diagnostics";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
const subscriptionCardSchema = z.object({ subscriptionId: z.uuid(), confirmCancelPending: z.literal(true) }).strict();

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  let body: unknown;
  try { body = await readJsonBody(request, 4096); }
  catch (error) { return NextResponse.json({ ok: false }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
  const parsed = subscriptionCardSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Confirmá que querés cancelar el intento pendiente." }, { status: 422 });
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claims?.claims?.sub !== "string") {
    checkoutFailure("authentication", claimsError ? "claims_error" : "missing_claims", claimsError);
    return NextResponse.json({ ok: false, message: "No pudimos validar tu sesión. Volvé a ingresar para continuar." }, { status: 401 });
  }
  const [{ data: legal }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("user_profiles").select("terms_version").eq("id", claims.claims.sub).maybeSingle(),
    supabase.rpc("my_professional_profile").select("id").maybeSingle(),
  ]);
  if (legal?.terms_version !== TERMS_VERSION) return NextResponse.json({ ok: false, message: "Aceptá los términos vigentes antes de continuar." }, { status: 428 });
  if (profileError || !profile) return NextResponse.json({ ok: false }, { status: 403 });
  const admin = createAdminClient();
  const limits = await Promise.all([
    consumeRateLimit(admin, { scope: "subscription.card.user", keyHash: hashIdentifier(String(claims.claims.sub)), limit: 6, windowSeconds: 600 }),
    consumeRateLimit(admin, { scope: "subscription.card.network", keyHash: requestFingerprint(request.headers), limit: 20, windowSeconds: 600 }),
  ]);
  if (limits.some((limit) => !limit.allowed)) return NextResponse.json({ ok: false, message: "Esperá unos minutos antes de volver a intentar." }, { status: limits.some((limit) => limit.unavailable) ? 503 : 429, headers: { "Retry-After": "600" } });
  try {
    const subscriptionId = await restartPendingCardCheckout(supabase, parsed.data.subscriptionId, profile.id);
    return NextResponse.json({ ok: true, redirectUrl: `/dashboard/suscripcion/pagar?subscriptionId=${subscriptionId}` });
  } catch (error) {
    checkoutFailure("provider_create", "operation_failed", error);
    return NextResponse.json({ ok: false, message: "No pudimos reiniciar este intento. Revisá el estado de tu suscripción antes de continuar." }, { status: 409 });
  }
}
