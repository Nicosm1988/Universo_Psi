import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ refresh: false }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options: { path: string } }[], headers: Record<string, string>) => void } }) => ({ auth: { getClaims: async () => {
  if (session.refresh) options.cookies.setAll([{ name: "sb-test-auth-token", value: "fresh", options: { path: "/" } }], { "Cache-Control": "private, no-store" });
  return { data: { claims: { sub: "test-user" } } };
} } }) }));
import { proxy } from "./proxy";

beforeEach(() => {
  session.refresh = false;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
});
it("forwards refreshed session cookies to the current API request and browser", async () => {
  session.refresh = true;
  const response = await proxy(new NextRequest("https://universo.example/api/subscriptions/card", { method: "POST", headers: { cookie: "sb-test-auth-token=expired; preference=dark" } }));
  expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-test-auth-token=fresh");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("preference=dark");
  expect(response.cookies.get("sb-test-auth-token")?.value).toBe("fresh");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'self' 'nonce-");
});
afterEach(() => vi.unstubAllEnvs());
it("preserves a checkout link for a person who is already signed in", async () => {
  const next = "/dashboard/suscripcion/pagar?subscriptionId=fixture";
  const response = await proxy(new NextRequest(`https://universo.example/ingresar?next=${encodeURIComponent(next)}`));
  expect(response.headers.get("location")).toBe(`https://universo.example${next}`);
});
it.each(["https://evil.example", "//evil.example", "/ingresar?next=/registro", "/registro"])("rejects external destinations and auth loops: %s", async (next) => {
  const response = await proxy(new NextRequest(`https://universo.example/ingresar?next=${encodeURIComponent(next)}`));
  expect(response.headers.get("location")).toBe("https://universo.example/dashboard");
});
