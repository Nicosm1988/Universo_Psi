import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ exchange: vi.fn(), profile: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import { GET } from "./route";
import { TERMS_VERSION } from "@/lib/legal";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchange.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { terms_version: TERMS_VERSION }, error: null });
  mocks.client.mockResolvedValue({ auth: { exchangeCodeForSession: mocks.exchange }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }) });
});
function request(query: Record<string, string>) { return new NextRequest(`https://universo-psi-eight.vercel.app/auth/callback?${new URLSearchParams(query)}`); }
async function destination(query: Record<string, string>) { return new URL((await GET(request(query))).headers.get("location")!); }
describe("callback OAuth", () => {
  it("conserva el plan después del intercambio PKCE", async () => {
    const next = "/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY";
    const url = await destination({ code: "one-time-code", next });
    expect(url.pathname + url.search).toBe(next);
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("one-time-code");
  });
  it("exige términos a una cuenta nueva antes de continuar", async () => {
    mocks.profile.mockResolvedValue({ data: null });
    const url = await destination({ code: "one-time-code", next: "/profesionales/sumarse" });
    expect(url.pathname).toBe("/aceptar-terminos");
    expect(url.searchParams.get("next")).toBe("/profesionales/sumarse");
  });
  it("presenta cancelación sin reflejar mensajes externos ni perder destino", async () => {
    const url = await destination({ error: "access_denied", error_description: "sensitive-provider-details", next: "/profesionales/sumarse" });
    expect(url.pathname).toBe("/ingresar");
    expect(url.searchParams.get("error")).toContain("se canceló");
    expect(url.href).not.toContain("sensitive-provider-details");
    expect(url.searchParams.get("next")).toBe("/profesionales/sumarse");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("recupera un código vencido y rechaza redirecciones externas", async () => {
    mocks.exchange.mockResolvedValue({ data: null, error: { code: "invalid_grant" } });
    const url = await destination({ code: "expired", next: "//evil.example" });
    expect(url.pathname).toBe("/ingresar");
    expect(url.searchParams.get("next")).toBe("/dashboard");
  });
});
