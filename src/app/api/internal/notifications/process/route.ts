import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  if (!serverEnv.CRON_SECRET) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${serverEnv.CRON_SECRET}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json(
      { ok: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await processNotificationOutbox({ batchSize: 25 });
  return Response.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
