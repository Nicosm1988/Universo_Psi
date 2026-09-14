import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn(async () => undefined) }));

import { fetchPublicCatalog } from "./public-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("lecturas públicas ante errores del gateway", () => {
  it("reintenta aunque Next conserve otra copia sin leer de la respuesta 504", async () => {
    const gatewayError = new Response("Gateway Timeout", { status: 504 });
    const cachedClone = gatewayError.clone();
    const success = Response.json([{ slug: "convenio" }]);
    const fetchMock = vi.fn().mockResolvedValueOnce(gatewayError).mockResolvedValueOnce(success);
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await fetchPublicCatalog("https://example.test/rest/v1/agreements")).toBe(success);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      await cachedClone.text();
    }
  });

  it("recupera un 504 sin alterar la consulta ni sus headers y evita reutilizar el error", async () => {
    const success = Response.json([{ slug: "convenio" }]);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("Gateway Timeout", { status: 504 }))
      .mockResolvedValueOnce(success);
    vi.stubGlobal("fetch", fetchMock);
    const init = { method: "GET", headers: { apikey: "public-test-key" } };
    expect(await fetchPublicCatalog("https://example.test/rest/v1/agreements?select=slug", init)).toBe(success);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual([
      "https://example.test/rest/v1/agreements?select=slug",
      { ...init, cache: "no-store", signal: expect.any(AbortSignal) },
    ]);
  });

  it("devuelve el error persistente después de tres intentos, sin catálogo vacío de reemplazo", async () => {
    const fetchMock = vi.fn(async () => new Response("Bad Gateway", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await fetchPublicCatalog("https://example.test/rest/v1/agreements");
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Bad Gateway");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([401, 403, 404, 429, 500, 503, 520])("no reintenta HTTP %s en esta capa", async (status) => {
    const response = new Response(null, { status });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPublicCatalog("https://example.test/rest/v1/agreements")).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["POST", "PATCH", "DELETE"])("nunca repite una escritura %s", async (method) => {
    const response = new Response(null, { status: 504 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPublicCatalog(new Request("https://example.test/rest/v1/rpc/action", { method }))).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("respeta la cancelación de la lectura antes de reintentar", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async () => {
      controller.abort();
      return new Response(null, { status: 504 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublicCatalog("https://example.test/rest/v1/agreements", { signal: controller.signal }))
      .rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
