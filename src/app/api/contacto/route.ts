import { after, NextResponse, type NextRequest } from "next/server";

import { isSameOrigin } from "@/lib/http/origin";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { hashIdentifier, requestFingerprint } from "@/lib/http/request";
import { deliverTransactionalEmail } from "@/lib/integrations/email";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { supportRequestSchema } from "@/lib/validation/support";

export const runtime = "nodejs";

const genericSuccess = {
  ok: true,
  message: "Recibimos tu mensaje. Te respondemos al correo que indicaste.",
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

  const parsed = supportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Revisá los datos del mensaje.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  // Honeypot: se responde igual que un envío válido para no dar señal.
  if (parsed.data.website) {
    return NextResponse.json(genericSuccess, { status: 201 });
  }

  if (serverEnv.UNIVERSO_PSI_TEST_MODE === "true") {
    return NextResponse.json(genericSuccess, { status: 201 });
  }

  const fingerprint = requestFingerprint(request.headers);
  const rawIdempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
  const idempotencyKeyHash = hashIdentifier(
    rawIdempotencyKey
      ? `support:${rawIdempotencyKey}`
      : `support:${parsed.data.email}:${parsed.data.topic}:${parsed.data.message}:${new Date().toISOString().slice(0, 10)}`,
  );

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const requesterUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  const admin = createAdminClient();
  const [networkLimit, senderLimit] = await Promise.all([
    consumeRateLimit(admin, {
      scope: "support.network",
      keyHash: fingerprint,
      limit: 6,
      windowSeconds: 600,
    }),
    consumeRateLimit(admin, {
      scope: "support.sender",
      keyHash: hashIdentifier(`support:${parsed.data.email}`),
      limit: 5,
      windowSeconds: 86_400,
    }),
  ]);
  if (!networkLimit.allowed || !senderLimit.allowed) {
    const resetAt = networkLimit.resetAt ?? senderLimit.resetAt;
    const retryAfter = resetAt
      ? Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000))
      : 60;
    const unavailable = networkLimit.unavailable || senderLimit.unavailable;
    return NextResponse.json(
      {
        ok: false,
        message: unavailable
          ? "No pudimos procesar el mensaje. Probá nuevamente en unos minutos."
          : `Alcanzaste el límite de mensajes. Probá nuevamente más tarde o escribinos a ${LEGAL_CONTACT_EMAIL}.`,
      },
      {
        status: unavailable ? 503 : 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const { error } = await admin.rpc("create_support_request_from_backend", {
    p_topic: parsed.data.topic,
    p_full_name: parsed.data.name,
    p_email: parsed.data.email,
    p_message: parsed.data.message,
    p_consent_version: parsed.data.consentVersion,
    p_consented_at: new Date().toISOString(),
    p_idempotency_key_hash: idempotencyKeyHash,
    p_requester_user_id: requesterUserId,
    p_landing_path: parsed.data.landingPath ?? request.nextUrl.pathname,
    p_fingerprint_hash: fingerprint,
  });

  if (error && error.code !== "23505") {
    console.error("support_request_create_failed", { code: error.code });
    return NextResponse.json(
      {
        ok: false,
        message: `No pudimos registrar el mensaje. Probá nuevamente en unos minutos o escribinos a ${LEGAL_CONTACT_EMAIL}.`,
      },
      { status: 503 },
    );
  }

  // Aviso interno al canal de soporte. El mensaje ya quedó persistido: si el
  // proveedor de correo no está configurado, el pedido igual se atiende desde
  // el panel de administración.
  if (!error) {
    after(async () => {
      const result = await deliverTransactionalEmail({
        to: LEGAL_CONTACT_EMAIL,
        subject: `Nuevo mensaje de contacto (${parsed.data.topic})`,
        text: `Se registró un nuevo mensaje en el formulario de contacto.\n\nMotivo: ${parsed.data.topic}\n\nPor privacidad, el contenido y los datos de contacto se consultan en el panel de administración.`,
      });
      if (result.status === "failed") {
        console.error("support_request_notice_failed");
      }
    });
  }

  return NextResponse.json(genericSuccess, { status: error ? 200 : 201 });
}
