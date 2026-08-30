import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

export function createAdminClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

// The supabase-js admin client has no getUserByEmail helper; the GoTrue
// admin REST API supports an exact-match `email` filter directly.
export async function findAdminUserIdByEmail(email: string): Promise<string | null> {
  const url = new URL("/auth/v1/admin/users", publicEnv.NEXT_PUBLIC_SUPABASE_URL);
  url.searchParams.set("email", email);

  const response = await fetch(url, {
    headers: {
      apikey: serverEnv.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${serverEnv.SUPABASE_SECRET_KEY}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data: unknown = await response.json();
  const users = Array.isArray(data)
    ? data
    : (data as { users?: unknown[] })?.users ?? [];
  const match = users.find(
    (candidate): candidate is { id: string; email: string } =>
      typeof candidate === "object" &&
      candidate !== null &&
      "email" in candidate &&
      typeof (candidate as { email?: unknown }).email === "string" &&
      (candidate as { email: string }).email.toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}
