import { NextResponse, type NextRequest } from "next/server";

import { isSameOrigin } from "@/lib/http/origin";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { serverEnv } from "@/lib/env/server";
import { paymentAvailability } from "@/lib/integrations/payments";
import { createCheckoutRedirectUrl } from "@/lib/subscriptions/checkout";
import { TERMS_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";
import { selectPlanSchema } from "@/lib/validation/subscription";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = selectPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  if (serverEnv.UNIVERSO_PSI_TEST_MODE === "true") {
    return NextResponse.json({
      ok: true,
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      status: "PENDING_PAYMENT",
      payment: paymentAvailability(),
    });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { data: legalProfile } = await supabase
    .from("user_profiles")
    .select("terms_version")
    .eq("id", claims.claims.sub)
    .maybeSingle();
  if (legalProfile?.terms_version !== TERMS_VERSION) {
    return NextResponse.json(
      { ok: false, acceptanceRequired: true },
      { status: 428 },
    );
  }

  const { data: subscriptionId, error } = await supabase.rpc(
    "select_professional_plan",
    {
      p_profile_id: parsed.data.professionalProfileId,
      p_plan_code: parsed.data.planCode,
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, message: "No pudimos guardar el plan." },
      { status: error.code === "42501" ? 403 : 422 },
    );
  }

  const payment = paymentAvailability();
  const redirectUrl = payment.configured
    ? await createCheckoutRedirectUrl(supabase, {
        subscriptionId,
        profileId: parsed.data.professionalProfileId,
        email: claims.claims.email as string | undefined,
      })
    : null;

  return NextResponse.json({
    ok: true,
    subscriptionId,
    status: "PENDING_PAYMENT",
    payment,
    ...(redirectUrl
      ? { redirectUrl }
      : {
          message: payment.configured
            ? "Guardamos tu elección, pero no pudimos iniciar el cobro. Volvé a intentar en unos minutos."
            : "Guardamos tu elección. Te avisaremos cuando el cobro en línea esté habilitado.",
        }),
  });
}
