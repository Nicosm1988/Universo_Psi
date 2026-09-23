import { createHash } from "node:crypto";

import { serverEnv } from "@/lib/env/server";

// Accepts both a Route Handler's `NextRequest.headers` and a Server Action's
// `await headers()` (next/headers) — both implement the standard Headers.get().
export function requestFingerprint(headers: Pick<Headers, "get">): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0];
  const ip = forwardedFor?.trim() || headers.get("x-real-ip") || "unknown";

  return hashIdentifier(ip);
}

export function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(`${serverEnv.RATE_LIMIT_SALT}:${value}`)
    .digest("hex");
}
