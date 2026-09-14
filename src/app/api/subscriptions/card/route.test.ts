import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ claims: vi.fn(), legal: vi.fn(), profile: vi.fn(), submit: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/http/request", () => ({ hashIdentifier: (value: string) => `hashed:${value}`, requestFingerprint: () => "network-hash" }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/subscriptions/checkout", () => ({ submitCardSubscription: mocks.submit }));
vi.mock("@/lib/subscriptions/checkout-diagnostics", () => ({ checkoutFailure: () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth: { getClaims: mocks.claims }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.legal }) }) }), rpc: () => ({ select: () => ({ maybeSingle: mocks.profile }) }) }) }));
import { TERMS_VERSION } from "@/lib/legal";
import { POST } from "./route";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const profileId = "20000000-0000-4000-8000-000000000001";
const body = { subscriptionId, payerEmail: "different-payer@example.invalid", cardTokenId: "ephemeral-token-value", consent: true };
const request = (payload: unknown = body, origin = "https://psi.example") => new NextRequest("https://psi.example/api/subscriptions/card", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-identity", email: "access-email@example.invalid" } } });
  mocks.legal.mockResolvedValue({ data: { terms_version: TERMS_VERSION } });
  mocks.profile.mockResolvedValue({ data: { id: profileId } });
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.submit.mockResolvedValue({ status: "PENDING_PAYMENT" });
});

describe("endpoint tarjeta, mocks locales", () => {
  it("correo pagador independiente no cambia propietario autenticado", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith(expect.anything(), profileId, body);
    expect(await response.json()).toEqual(expect.objectContaining({ status: "PENDING_PAYMENT" }));
  });
  it.each([{ ...body, consent: false }, { ...body, payerEmail: "invalid" }, { ...body, cardNumber: "4111111111111111" }, { ...body, securityCode: "123" }, { ...body, amount: 1 }])("rechaza datos sensibles/importe del cliente o consentimiento inválido", async (payload) => {
    expect((await POST(request(payload))).status).toBe(422);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("rechaza origen ajeno y no reserva proveedor", async () => {
    expect((await POST(request(body, "https://foreign.example"))).status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("rechaza identidad ausente, aceptación vieja y perfil inaccesible", async () => {
    mocks.claims.mockResolvedValueOnce({ data: null });
    expect((await POST(request())).status).toBe(401);
    mocks.legal.mockResolvedValueOnce({ data: { terms_version: "old" } });
    expect((await POST(request())).status).toBe(428);
    mocks.profile.mockResolvedValueOnce({ data: null });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("límite por cuenta y red detiene autorización; falla rate-limit cierra endpoint", async () => {
    mocks.limit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(request())).status).toBe(429);
    mocks.limit.mockResolvedValueOnce({ allowed: false, unavailable: true });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("falla persistencia no devuelve éxito ni activa", async () => {
    mocks.submit.mockRejectedValue(new Error("private details"));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain("private details");
  });
});
