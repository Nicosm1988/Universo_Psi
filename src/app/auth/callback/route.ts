import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/http/origin";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/legal";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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
