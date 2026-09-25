import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/http/origin";

const protectedPrefixes = ["/dashboard", "/admin", "/profesionales/sumarse"];
const authPaths = ["/ingresar", "/registro"];

function buildContentSecurityPolicy(nonce: string, supabaseUrl: string, embeddedCheckout = false) {
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const websocketOrigin = supabaseOrigin.replace("https://", "wss://");
  const development = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    `img-src 'self' data: blob: ${supabaseOrigin} https://lh3.googleusercontent.com`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${websocketOrigin} https://*.vercel-insights.com https://vitals.vercel-insights.com${embeddedCheckout ? " https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com" : ""}`,
    ...(embeddedCheckout ? ["frame-src https://*.mercadopago.com"] : []),
    `media-src 'self' blob: ${supabaseOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function copyResponseState(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const [key, value] of from.headers.entries()) {
    if (key !== "location") to.headers.set(key, value);
  }
  return to;
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Service unavailable", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce, supabaseUrl, request.nextUrl.pathname === "/dashboard/suscripcion/pagar");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      encode: "tokens-only",
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, authHeaders) => {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        // Forward refreshed credentials to the current handler, not just the
        // browser's next request. The CSP header clone predates the refresh.
        const refreshedCookie = request.headers.get("cookie");
        if (refreshedCookie) requestHeaders.set("cookie", refreshedCookie);
        else requestHeaders.delete("cookie");

        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.headers.set("Content-Security-Policy", csp);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(authHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) &&
    !isAuthenticated
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/ingresar";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return copyResponseState(response, NextResponse.redirect(loginUrl));
  }

  if (authPaths.includes(pathname) && isAuthenticated) {
    const destination = new URL(safeInternalPath(request.nextUrl.searchParams.get("next")), request.url);
    // Preserve checkout/deep links for an existing session without auth loops.
    if (authPaths.includes(destination.pathname)) {
      destination.pathname = "/dashboard";
      destination.search = "";
    }
    return copyResponseState(response, NextResponse.redirect(destination));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
