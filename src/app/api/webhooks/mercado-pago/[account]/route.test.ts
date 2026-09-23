import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ account: vi.fn(), signature: vi.fn(), preapproval: vi.fn(), authorized: vi.fn(), payment: vi.fn() }));
vi.mock("@/lib/integrations/payments", () => ({ resolvePaymentAccount: mocks.account, verifyMercadoPagoSignature: mocks.signature }));
vi.mock("@/lib/subscriptions/reconcile", () => ({ reconcileAuthorizedPayment: mocks.authorized, reconcilePaymentNotification: mocks.payment, reconcilePreapproval: mocks.preapproval, reconciliationFailureDetails: () => ({ phase: "resource_reconciliation" }) }));
import { POST } from "./route";

function request(body: unknown = { type: "payment", data: { id: "123" } }, query = "data.id=123", headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/webhooks/mercado-pago/personal?${query}`, { method: "POST", headers: { "x-signature": "fixture-signature", "x-request-id": "fixture-request", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
const context = (account = "personal") => ({ params: Promise.resolve({ account }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockReturnValue({ key: "personal" });
  mocks.signature.mockReturnValue(true);
  mocks.preapproval.mockResolvedValue(undefined);
  mocks.authorized.mockResolvedValue(undefined);
  mocks.payment.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("endpoint de webhook", () => {
  it("cuenta ausente o inválida responde 503", async () => {
    expect((await POST(request(), context("unknown"))).status).toBe(503);
    mocks.account.mockReturnValue(null);
    expect((await POST(request(), context())).status).toBe(503);
    expect(mocks.payment).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { type: "payment" }, { type: "payment", data: { id: "../escape" } }])("cuerpo inválido no llega al proveedor %j", async (body) => {
    expect((await POST(request(body), context())).status).toBe(400);
    expect(mocks.payment).not.toHaveBeenCalled();
  });
  it("JSON inválido y cuerpo mayor a 16KiB fallan explícitamente", async () => {
    expect((await POST(request("{"), context())).status).toBe(400);
    expect((await POST(request({ type: "payment", data: { id: "123" }, padding: "x".repeat(17000) }), context())).status).toBe(413);
  });
  it.each(["", "data.id=456", "data.id=123&data.id=456"])("ID de URL ausente, cruzado o repetido se rechaza: %s", async (query) => {
    expect((await POST(request(undefined, query), context())).status).toBe(400);
    expect(mocks.signature).not.toHaveBeenCalled();
  });
  it("firma inválida devuelve 401 y no reconcilia", async () => {
    mocks.signature.mockReturnValue(false);
    expect((await POST(request(), context())).status).toBe(401);
    expect(mocks.payment).not.toHaveBeenCalled();
  });
  it.each([["payment", "payment"], ["subscription_preapproval", "preapproval"], ["subscription_authorized_payment", "authorized"]] as const)("%s sólo transmite ID verificado y cuenta", async (type, handler) => {
    const response = await POST(request({ type, data: { id: 123 }, id: "unsigned-event", date_created: "2099-01-01", user_id: "foreign", live_mode: true }), context("company"));
    expect(response.status).toBe(200);
    expect(mocks[handler]).toHaveBeenCalledExactlyOnceWith("123", "company");
    expect(mocks.signature).toHaveBeenCalledWith(expect.objectContaining({ dataId: "123", accountKey: "company" }));
  });
  it("metadatos repetidos o alterados no generan nueva identidad de pago", async () => {
    for (const id of ["event-1", "event-1", "forged-event-2"]) {
      expect((await POST(request({ type: "payment", data: { id: "123" }, id }), context())).status).toBe(200);
    }
    expect(mocks.payment.mock.calls).toEqual([["123", "personal"], ["123", "personal"], ["123", "personal"]]);
  });
  it("404 de simulador o error RPC devuelve 502, no éxito falso", async () => {
    mocks.payment.mockRejectedValue(new Error("provider not found or RPC failed"));
    const response = await POST(request(), context());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: "reconciliation_failed" });
    expect(console.error).toHaveBeenCalledWith("mercado_pago_reconciliation_failed", { account: "personal", type: "payment", phase: "resource_reconciliation" });
  });
  it("tipo ajeno firmado queda explícitamente ignorado", async () => {
    const response = await POST(request({ type: "merchant_order", data: { id: "123" } }), context());
    expect(await response.json()).toEqual({ ok: true, ignored: true });
    expect(mocks.payment).not.toHaveBeenCalled();
  });
});
