import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function consumeRateLimit(
  client: SupabaseClient,
  input: { scope: string; keyHash: string; limit: number; windowSeconds: number },
) {
  const { data, error } = await client.rpc("consume_rate_limit_from_backend", {
    p_scope: input.scope,
    p_key_hash: input.keyHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error || !data?.[0]) {
    return { allowed: false, resetAt: null, unavailable: true } as const;
  }

  return {
    allowed: Boolean(data[0].allowed),
    resetAt: typeof data[0].reset_at === "string" ? data[0].reset_at : null,
    unavailable: false,
  } as const;
}
