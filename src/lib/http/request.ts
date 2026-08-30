import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env/server";

export function requestFingerprint(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip = forwardedFor?.trim() || request.headers.get("x-real-ip") || "unknown";

  return hashIdentifier(ip);
}

export function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(`${serverEnv.RATE_LIMIT_SALT}:${value}`)
    .digest("hex");
}
