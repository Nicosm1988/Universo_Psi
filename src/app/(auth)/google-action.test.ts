import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ availability: vi.fn(), resolve: vi.fn(), oauth: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnv: { UNIVERSO_PSI_TEST_MODE: "false" } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://universo-psi-eight.vercel.app" } }));
vi.mock("@/lib/auth/providers", () => ({ googleAvailability: mocks.availability, resolveGoogleAuthorization: mocks.resolve }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(), findAdminUserIdByEmail: vi.fn() }));
vi.mock("@/lib/integrations/email", () => ({ deliverTransactionalEmail: vi.fn() }));
vi.mock("@/lib/http/request", () => ({ hashIdentifier: vi.fn(), requestFingerprint: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn() }));
import { signInWithGoogleAction } from "./actions";
function form(next = "/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY") { const f = new FormData();f.set("next", next);return f; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.availability.mockResolvedValue("available");
  mocks.oauth.mockResolvedValue({ data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" }, error: null });
  mocks.client.mockResolvedValue({ auth: { signInWithOAuth: mocks.oauth } });
  mocks.resolve.mockResolvedValue("https://accounts.google.com/oauth");
});
async function redirectOf(f: FormData) {
  try { await signInWithGoogleAction(f); } catch (e) { return new URL((e as Error).message.replace("redirect:", ""), "https://universo-psi-eight.vercel.app"); }
  throw new Error("missing redirect");
}
describe("acción Google", () => {
  it.each(["disabled", "unavailable"])("rechaza también formularios antiguos cuando el proveedor está %s", async status => {
    mocks.availability.mockResolvedValue(status);
    const url = await redirectOf(form());
    expect(url.pathname).toBe("/ingresar");
    expect(url.searchParams.get("next")).toBe("/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("conserva el destino en callback y redirige después de verificar autorización", async () => {
    expect((await redirectOf(form())).hostname).toBe("accounts.google.com");
    const options = mocks.oauth.mock.calls[0]![0].options;
    expect(options.skipBrowserRedirect).toBe(true);
    expect(new URL(options.redirectTo).searchParams.get("next")).toBe("/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY");
  });
  it("recupera una configuración rota entre render y click", async () => {
    mocks.resolve.mockResolvedValue(null);
    const url = await redirectOf(form());
    expect(url.pathname).toBe("/ingresar");
    expect(url.searchParams.get("error")).toContain("Google no está disponible");
  });
  it("mantiene la intención profesional del registro sin next explícito", async () => {
    const f = form("");f.set("accountType", "PROFESSIONAL");
    await redirectOf(f);
    expect(new URL(mocks.oauth.mock.calls[0]![0].options.redirectTo).searchParams.get("next")).toBe("/profesionales/sumarse");
  });
  it("no propaga un destino externo", async () => {
    mocks.availability.mockResolvedValue("disabled");
    expect((await redirectOf(form("//evil.example"))).searchParams.get("next")).toBe("/dashboard");
  });
});
