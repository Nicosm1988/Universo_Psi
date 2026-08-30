import { after, NextResponse, type NextRequest } from "next/server";

import { isSameOrigin } from "@/lib/http/origin";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { hashIdentifier, requestFingerprint } from "@/lib/http/request";
import { serverEnv } from "@/lib/env/server";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { leadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";

const genericSuccess = {
  ok: true,
  message: "Tu consulta fue enviada. Te avisaremos los próximos pasos.",
};

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Solicitud no válida." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ ok: false, message: "Formato no válido." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ ok: false, message: "Solicitud demasiado grande." }, { status: 413 });
    }
    return NextResponse.json({ ok: false, message: "Datos no válidos." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Revisá los datos de la consulta.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  // Honeypot: acknowledge quietly so automated submissions get no signal.
  if (parsed.data.website) {
    return NextResponse.json(genericSuccess, { status: 201 });
  }

  if (serverEnv.UNIVERSO_PSI_TEST_MODE === "true") {
    return NextResponse.json(genericSuccess, { status: 201 });
  }

  const fingerprint = requestFingerprint(request);
  const rawIdempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
  const idempotencyKeyHash = hashIdentifier(
    rawIdempotencyKey
      ? `${parsed.data.professionalProfileId}:${rawIdempotencyKey}`
      : `${parsed.data.professionalProfileId}:${parsed.data.email}:${parsed.data.message}:${new Date().toISOString().slice(0, 10)}`,
  );

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const consumerUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  const admin = createAdminClient();
  const [networkLimit, recipientLimit] = await Promise.all([
    consumeRateLimit(admin, {
      scope: "lead.network",
      keyHash: fingerprint,
      limit: 6,
      windowSeconds: 600,
    }),
    consumeRateLimit(admin, {
      scope: "lead.recipient",
      keyHash: hashIdentifier(
        `${parsed.data.professionalProfileId}:${parsed.data.email}`,
      ),
      limit: 3,
      windowSeconds: 86_400,
    }),
  ]);
  if (!networkLimit.allowed || !recipientLimit.allowed) {
    const resetAt = networkLimit.resetAt ?? recipientLimit.resetAt;
    const retryAfter = resetAt
      ? Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000))
      : 60;
    return NextResponse.json(
      {
        ok: false,
        message: networkLimit.unavailable || recipientLimit.unavailable
          ? "No pudimos procesar la consulta. Probá nuevamente en unos minutos."
          : "Alcanzaste el límite de consultas. Probá nuevamente más tarde.",
      },
      {
        status: networkLimit.unavailable || recipientLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const { error } = await admin.rpc("create_lead_from_backend", {
    p_professional_profile_id: parsed.data.professionalProfileId,
    p_full_name: parsed.data.name,
    p_email: parsed.data.email,
    p_message: parsed.data.message,
    p_contact_preference: parsed.data.contactPreference,
    p_source: parsed.data.source,
    p_consent_version: parsed.data.consentVersion,
    p_consented_at: new Date().toISOString(),
    p_idempotency_key_hash: idempotencyKeyHash,
    p_consumer_user_id: consumerUserId,
    p_need_id: parsed.data.needId ?? null,
    p_phone: parsed.data.phone ?? null,
    p_campaign: parsed.data.campaign ?? null,
    p_utm_source: parsed.data.utmSource ?? null,
    p_utm_medium: parsed.data.utmMedium ?? null,
    p_utm_campaign: parsed.data.utmCampaign ?? null,
    p_landing_path: parsed.data.landingPath ?? request.nextUrl.pathname,
    p_plan_code_snapshot: null,
    p_fingerprint_hash: fingerprint,
  });

  if (error && error.code !== "23505") {
    console.error("lead_create_failed", { code: error.code });
    return NextResponse.json(
      {
        ok: false,
        message: "No pudimos enviar la consulta. Probá nuevamente en unos minutos.",
      },
      { status: 503 },
    );
  }

  after(async () => {
    const result = await processNotificationOutbox({ batchSize: 5 });
    if (!result.ok) {
      console.error("notification_outbox_after_failed", {
        completionFailed: result.completionFailed,
      });
    }
  });

  return NextResponse.json(genericSuccess, { status: error ? 200 : 201 });
}
