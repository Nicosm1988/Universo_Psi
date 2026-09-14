import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/public", () => ({ publicEnv: {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
} }));
import { googleAvailability, resolveGoogleAuthorization } from "./providers";

afterEach(() => vi.unstubAllGlobals());
const authorize = "https://project.supabase.co/auth/v1/authorize?provider=google&code_challenge=pkce";

describe("disponibilidad real de Google", () => {
  it.each([
    [{ external: { google: true } }, "available"],
    [{ external: { google: false } }, "disabled"],
    [{ external: { google: "true" } }, "unavailable"],
    [{ external: {} }, "unavailable"],
    [null, "unavailable"],
  ])("interpreta la configuración estrictamente", async (body, result) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect(await googleAvailability()).toBe(result);
  });
  it("reconsulta después de un cambio, sin cachear la configuración anterior", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ external: { google: true } }))
      .mockResolvedValueOnce(Response.json({ external: { google: false } }));
    vi.stubGlobal("fetch", fetch);
    expect(await googleAvailability()).toBe("available");
    expect(await googleAvailability()).toBe("disabled");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/v1/settings"), expect.objectContaining({ cache: "no-store", redirect: "error", signal: expect.any(AbortSignal) }));
  });
  it.each([new Response("upstream", { status: 503 }), new Response("invalid-json")])("cierra sólo Google ante respuesta inválida", async response => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    expect(await googleAvailability()).toBe("unavailable");
  });
  it("tolera timeout o caída de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await googleAvailability()).toBe("unavailable");
  });
});

describe("inicio OAuth comprobado antes de salir del sitio", () => {
  it("conserva PKCE y sólo permite el redirect HTTPS hacia Google", async () => {
    const destination = "https://accounts.google.com/o/oauth2/v2/auth?state=signed-state";
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: destination } }));
    vi.stubGlobal("fetch", fetch);
    expect(await resolveGoogleAuthorization(authorize)).toBe(destination);
    expect(fetch.mock.calls[0]![0].toString()).toBe(authorize);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ redirect: "manual", cache: "no-store" });
  });
  it.each([
    [400, undefined], [500, undefined], [200, undefined],
    [302, "https://evil.example"], [302, "http://accounts.google.com/oauth"],
    [302, "https://accounts.google.com.evil.example/oauth"],
    [302, "https://name:password@accounts.google.com/oauth"],
    [302, "https://accounts.google.com:444/oauth"],
    [302, "https://universo-psi-eight.vercel.app/auth/callback?error=server_error"],
  ])("maneja estado %s y destino inválido sin redirigir al error del proveedor", async (status, location) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status, headers: location ? { location } : {} })));
    expect(await resolveGoogleAuthorization(authorize)).toBeNull();
  });
  it.each(["https://evil.example/auth/v1/authorize?provider=google", "https://project.supabase.co/rest/v1/users?provider=google", "https://project.supabase.co/auth/v1/authorize?provider=github"])("rechaza URL ajena antes de enviar la clave pública", async url => {
    const fetch = vi.fn();vi.stubGlobal("fetch", fetch);
    expect(await resolveGoogleAuthorization(url)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
