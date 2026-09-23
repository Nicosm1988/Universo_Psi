import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnv: { MERCADOPAGO_ACTIVE_ACCOUNT: "personal", MERCADOPAGO_PERSONAL_ACCESS_TOKEN: "fixture-token", MERCADOPAGO_PERSONAL_WEBHOOK_SECRET: "fixture-secret", MERCADOPAGO_PERSONAL_COLLECTOR_ID: "101", MERCADOPAGO_PERSONAL_ENVIRONMENT: "sandbox" } }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://psi.example" } }));
import { cancelPendingPreapproval, createCardSubscription } from "./payments";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const resource = (status = "authorized") => ({ id: "pre-1", status, collector_id: 101, external_reference: subscriptionId, last_modified: "2026-09-12T12:00:00Z", auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 120000, currency_id: "ARS" } });
const fetchMock = vi.fn<typeof fetch>();
const respond = (body: unknown) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("contrato tarjeta suscripción", () => {
  it("envía card_token_id y pagador independiente a preapproval, no payment único", async () => {
    respond(resource());
    const result = await createCardSubscription({ subscriptionId, payerEmail: "payer@example.invalid", planName: "Mensual", amount: 120000, currency: "ARS", cardTokenId: "token-ephemeral" });
    expect(result.status).toBe("authorized");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.mercadopago.com/preapproval");
    expect(JSON.parse(String(options?.body))).toEqual(expect.objectContaining({ payer_email: "payer@example.invalid", card_token_id: "token-ephemeral", status: "authorized", external_reference: subscriptionId }));
  });
  it("no acepta monto diferente del proveedor", async () => {
    respond({ ...resource(), auto_recurring: { ...resource().auto_recurring, transaction_amount: 1 } });
    await expect(createCardSubscription({ subscriptionId, payerEmail: "payer@example.invalid", planName: "Mensual", amount: 120000, currency: "ARS", cardTokenId: "token-ephemeral" })).rejects.toThrow();
  });
  it.each(["authorized", "paused"])("no cancela proveedor %s para reemplazar intento", async (status) => {
    respond(resource(status));
    await expect(cancelPendingPreapproval("pre-1", "personal")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("no cancela pendiente con historia de facturación", async () => {
    respond(resource("pending")); respond({ paging: { total: 1 }, results: [{ id: "invoice-1" }] });
    await expect(cancelPendingPreapproval("pre-1", "personal")).rejects.toThrow();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  });
  it("recupera cancelación previa sin repetir PUT tras fallo parcial local", async () => {
    respond(resource("cancelled")); respond({ paging: { total: 0 }, results: [] });
    await expect(cancelPendingPreapproval("pre-1", "personal")).resolves.toEqual(expect.objectContaining({ status: "cancelled" }));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  });
  it("confirma cancelación vía GET antes de permitir reemplazo", async () => {
    respond(resource("pending")); respond({ paging: { total: 0 }, results: [] }); respond(resource("canceled")); respond(resource("canceled"));
    await expect(cancelPendingPreapproval("pre-1", "personal")).resolves.toEqual(expect.objectContaining({ status: "cancelled" }));
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(["GET", "GET", "PUT", "GET"]);
  });
});
