import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/http/origin";
import { TERMS_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES: EmailOtpType[] = [
  "signup",
  "recovery",
  "invite",
  "email_change",
  "email",
  "magiclink",
];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));

  if (tokenHash && type && VALID_TYPES.includes(type as EmailOtpType)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error && data.user) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/actualizar-contrasena", request.url));
      }

      const { data: legalProfile } = await supabase
        .from("user_profiles")
        .select("terms_version")
        .eq("id", data.user.id)
        .maybeSingle();
      if (legalProfile?.terms_version !== TERMS_VERSION) {
        const acceptanceUrl = new URL("/aceptar-terminos", request.url);
        acceptanceUrl.searchParams.set("next", next);
        return NextResponse.redirect(acceptanceUrl);
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const errorUrl = new URL("/ingresar", request.url);
  errorUrl.searchParams.set(
    "error",
    "El enlace no es válido o venció. Solicitá uno nuevo.",
  );
  return NextResponse.redirect(errorUrl);
}
