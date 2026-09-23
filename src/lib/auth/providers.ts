import "server-only";

import { publicEnv } from "@/lib/env/public";

export type GoogleAvailability = "available" | "disabled" | "unavailable";

// Read the actual project configuration on every request. A build-time flag can
// drift from Supabase and advertise a provider that rejects every login.
export async function googleAvailability(): Promise<GoogleAvailability> {
  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return "unavailable";
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== "object" || !("external" in settings)) return "unavailable";
    const external = settings.external;
    if (!external || typeof external !== "object" || !("google" in external)) return "unavailable";
    return external.google === true ? "available" : external.google === false ? "disabled" : "unavailable";
  } catch {
    return "unavailable";
  }
}

// signInWithOAuth only builds a URL; it does not contact the provider. Resolve
// Supabase's first redirect here so a configuration failure stays inside our UI.
// Keep the SDK-generated PKCE challenge and its request-scoped verifier cookie.
export async function resolveGoogleAuthorization(authorizeUrl: string): Promise<string | null> {
  try {
    const url = new URL(authorizeUrl);
    const base = new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL);
    if (url.origin !== base.origin || url.pathname !== "/auth/v1/authorize" || url.searchParams.get("provider") !== "google") return null;
    const response = await fetch(url, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const location = response.headers.get("location");
    if (![302, 303, 307].includes(response.status) || !location) return null;
    const destination = new URL(location);
    if (destination.protocol !== "https:" || destination.hostname !== "accounts.google.com" || destination.port || destination.username || destination.password) return null;
    return destination.toString();
  } catch {
    return null;
  }
}
