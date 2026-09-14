// Read-only smoke test. Run with the environment of the deployment being checked.
// Never prints API keys, OAuth URLs/state, Client Secrets or user information.
import { createHash, randomBytes } from "node:crypto";

const { NEXT_PUBLIC_SUPABASE_URL: base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  NEXT_PUBLIC_SITE_URL: site } = process.env;
if (!base || !key || !site) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SITE_URL.");
  process.exit(1);
}
const headers = { apikey: key };
const result = { googleEnabled: false, authorizationRedirectValid: false, callbackMatches: false };
try {
  const settings = await fetch(`${base}/auth/v1/settings`, { headers, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!settings.ok) throw new Error("settings_unavailable");
  result.googleEnabled = (await settings.json()).external?.google === true;
  if (!result.googleEnabled) throw new Error("google_disabled");
  const url = new URL(`${base}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", new URL("/auth/callback", site).href);
  url.searchParams.set("code_challenge", createHash("sha256").update(randomBytes(32)).digest("base64url"));
  url.searchParams.set("code_challenge_method", "s256");
  const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(10000) });
  const location = response.headers.get("location");
  const destination = location ? new URL(location) : null;
  result.authorizationRedirectValid = [302, 303, 307].includes(response.status) && destination?.origin === "https://accounts.google.com";
  result.callbackMatches = destination?.searchParams.get("redirect_uri") === `${base}/auth/v1/callback`;
  if (!result.authorizationRedirectValid || !result.callbackMatches) throw new Error("authorization_unavailable");
  console.log(JSON.stringify({ ...result, status: "PASS", limitation: "Falta completar el consentimiento y retorno con una cuenta Google para acreditar login end-to-end." }));
} catch (error) {
  const reason = ["settings_unavailable", "google_disabled", "authorization_unavailable"].includes(error.message) ? error.message : "transport_or_invalid_response";
  console.error(JSON.stringify({ ...result, status: "FAIL", reason }));
  process.exitCode = 1;
}
