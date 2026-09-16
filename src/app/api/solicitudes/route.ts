import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { hashIdentifier, requestFingerprint } from "@/lib/http/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { legalRequestSchema } from "@/lib/validation/legal-request";

export const runtime = "nodejs";
const respond = (body: object, status: number) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return respond({ message: "Solicitud no válida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return respond({ message: "Formato no válido." }, 415);
  let body: unknown;
  try { body = await readJsonBody(request, 12 * 1024); }
  catch (error) { return respond({ message: "No pudimos leer la solicitud." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  const parsed = legalRequestSchema.safeParse(body);
  if (!parsed.success) return respond({ message: "Revisá el correo, el tipo de pedido y el límite de 2000 caracteres." }, 422);
  try {
    const admin = createAdminClient();
    const limit = await consumeRateLimit(admin, { scope: "legal.network", keyHash: requestFingerprint(request.headers), limit: 10, windowSeconds: 600 });
    if (!limit.allowed) return respond({ message: "No pudimos registrar la solicitud ahora. Podés escribir a hola@universosenda.com." }, limit.unavailable ? 503 : 429);
    const { data, error } = await admin.rpc("create_legal_request_from_backend", {
      p_kind: parsed.data.kind, p_email: parsed.data.email, p_message: parsed.data.message,
      p_key: hashIdentifier(JSON.stringify(parsed.data)),
    });
    if (error || typeof data !== "string") {
      console.error("legal_request_create_failed", { code: error?.code ?? "invalid_result" });
      return respond({ message: "No se registró la solicitud. Reintentá o escribí a hola@universosenda.com." }, 503);
    }
    return respond({ reference: data, receivedAt: new Date().toISOString() }, 201);
  } catch {
    return respond({ message: "No se registró la solicitud. Reintentá o escribí a hola@universosenda.com." }, 503);
  }
}
