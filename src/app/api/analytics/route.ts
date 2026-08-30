import { NextResponse, type NextRequest } from "next/server";

import { isSameOrigin } from "@/lib/http/origin";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { hashIdentifier, requestFingerprint } from "@/lib/http/request";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  analyticsPropertiesAreSafe,
  analyticsSchema,
} from "@/lib/validation/analytics";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = analyticsSchema.safeParse(body);
  if (
    !parsed.success ||
    !analyticsPropertiesAreSafe(
      parsed.data.eventName,
      parsed.data.properties,
    )
  ) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  if (serverEnv.UNIVERSO_PSI_TEST_MODE === "true") {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  const anonymousIdHash = parsed.data.anonymousId
    ? hashIdentifier(parsed.data.anonymousId)
    : requestFingerprint(request);
  const sessionId = parsed.data.sessionId
    ? hashIdentifier(parsed.data.sessionId)
    : null;

  const admin = createAdminClient();
  const rateLimit = await consumeRateLimit(admin, {
    scope: "analytics.network",
    keyHash: requestFingerprint(request),
    limit: 120,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false },
      { status: rateLimit.unavailable ? 503 : 429 },
    );
  }

  const { error } = await admin.rpc("record_analytics_event_from_backend", {
    p_event_name: parsed.data.eventName,
    p_anonymous_id_hash: anonymousIdHash,
    p_user_id: userId,
    p_session_id: sessionId,
    p_path: parsed.data.path ?? null,
    p_professional_profile_id: parsed.data.professionalProfileId ?? null,
    p_article_id: parsed.data.articleId ?? null,
    p_agreement_id: parsed.data.agreementId ?? null,
    p_properties: parsed.data.properties,
    p_occurred_at: new Date().toISOString(),
  });

  if (error) {
    console.error("analytics_record_failed", { code: error.code });
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
