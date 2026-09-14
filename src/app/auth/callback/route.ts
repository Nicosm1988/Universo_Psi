import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/http/origin";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/legal";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));

  const providerError = request.nextUrl.searchParams.get("error");

  if (code && !providerError) {
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
  errorUrl.searchParams.set("next", next);
  errorUrl.searchParams.set(
    "error",
    providerError === "access_denied"
      ? "El acceso con Google se canceló. Podés intentarlo de nuevo o ingresar con email."
      : "No pudimos completar el acceso. Volvé a intentarlo desde esta página.",
  );
  return NextResponse.redirect(errorUrl);
}
