import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      return false;
    }

    const allowedOrigins = new Set([request.nextUrl.origin]);
    const host = request.headers.get("host");
    if (host) allowedOrigins.add(`${request.nextUrl.protocol}//${host}`);
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    }

    return allowedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}

export function safeInternalPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://universo-psi.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin || !resolved.pathname.startsWith("/")) {
      return fallback;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
