import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/lib/http/request", () => ({ hashIdentifier: (value: string) => value, requestFingerprint: () => "network" }));
import { POST } from "./route";
const input = { kind: "CANCELLATION", email: "someone@example.com", message: "Quiero cancelar la suscripción", requestId: "10000000-0000-4000-8000-000000000001" };
function request(body: unknown = input, origin = "https://psi.example") {
  return new NextRequest("https://psi.example/api/solicitudes", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue({ allowed: true }); mocks.rpc.mockResolvedValue({ data: "20000000-0000-4000-8000-000000000002", error: null }); });
it("registra una solicitud sin autenticar y entrega constancia sin revelar cuentas", async () => {
  const response = await POST(request()); expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ reference: "20000000-0000-4000-8000-000000000002" });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it("rechaza otro origen antes de escribir", async () => { expect((await POST(request(input, "https://other.example"))).status).toBe(403); expect(mocks.rpc).not.toHaveBeenCalled(); });
it("rechaza mensajes y categorías inválidos", async () => { expect((await POST(request({ ...input, kind: "ADMIN", message: "x" }))).status).toBe(422); expect(mocks.rpc).not.toHaveBeenCalled(); });
it("no simula recepción cuando la base falla", async () => { mocks.rpc.mockResolvedValue({ error: { code: "database_error" } }); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty("reference"); });
it("falla cerrado si el rate limit está indisponible", async () => { mocks.limit.mockResolvedValue({ allowed: false, unavailable: true }); expect((await POST(request())).status).toBe(503); expect(mocks.rpc).not.toHaveBeenCalled(); });
it("maneja excepción de red sin exponer detalles", async () => { mocks.rpc.mockRejectedValue(new Error("secret transport details")); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret"); });
it("un reintento conserva su clave y un cambio de contenido la cambia", async () => { await POST(request()); const first = mocks.rpc.mock.calls[0]![1].p_key; await POST(request()); expect(mocks.rpc.mock.calls[1]![1].p_key).toBe(first); await POST(request({ ...input, email: "another@example.com" })); expect(mocks.rpc.mock.calls[2]![1].p_key).not.toBe(first); });

it("permite solicitar la baja sin explicar un motivo", async () => { expect((await POST(request({ ...input, message: "" }))).status).toBe(201); expect(mocks.rpc).toHaveBeenCalledWith("create_legal_request_from_backend", expect.objectContaining({ p_message: "Sin detalle adicional." })); });
