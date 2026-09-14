import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), account: vi.fn(), preapproval: vi.fn(), authorized: vi.fn(), payment: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/payments", () => ({ resolvePaymentAccount: mocks.account, verifyPaymentAccountIdentity: mocks.verify }));
vi.mock("@/lib/subscriptions/reconcile", () => ({ reconcileAuthorizedPayment: mocks.authorized, reconcileOneTimePayment: mocks.payment, reconcilePreapproval: mocks.preapproval }));
import { reconcileSubscriptionResources } from "./reconcile-search";

const input = { subscriptionId: "10000000-0000-4000-8000-000000000001", providerSubscriptionId: "pre-1", accountKey: "personal" as const, paymentModel: "RECURRING" as const };
const fetchMock = vi.fn<typeof fetch>();
const respond = (results: unknown[], total = results.length, offset = 0, limit = 12) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ results, paging: { total, offset, limit } })));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue(undefined);
  mocks.account.mockReturnValue({ accessToken: "unit-test-only" });
  mocks.preapproval.mockResolvedValue(undefined);
  mocks.authorized.mockResolvedValue(undefined);
  mocks.payment.mockResolvedValue(undefined);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("recuperación de notificaciones perdidas", () => {
  it("recurrente valida cada factura por reconciliación y deduplica resultados", async () => {
    respond([{ id: "invoice-1", preapproval_id: "pre-1" }, { id: "invoice-1", preapproval_id: "pre-1" }]);
    await expect(reconcileSubscriptionResources(input)).resolves.toEqual({ reconciled: 1 });
    expect(mocks.preapproval).toHaveBeenCalledExactlyOnceWith("pre-1", "personal");
    expect(mocks.authorized).toHaveBeenCalledExactlyOnceWith("invoice-1", "personal");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("preapproval_id=pre-1");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.has("limit")).toBe(false);
    expect(url.searchParams.has("offset")).toBe(false);
  });
  it("pago único filtra UUID y reconcilia pago real", async () => {
    respond([{ id: 123, external_reference: input.subscriptionId }]);
    await expect(reconcileSubscriptionResources({ ...input, paymentModel: "ONE_TIME" })).resolves.toEqual({ reconciled: 1 });
    expect(mocks.preapproval).not.toHaveBeenCalled();
    expect(mocks.payment).toHaveBeenCalledExactlyOnceWith("123", "personal");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`external_reference=${input.subscriptionId}`);
  });
  it.each(["RECURRING", "ONE_TIME"] as const)("rechaza historial ajeno %s", async (paymentModel) => {
    respond([{ id: "foreign", preapproval_id: "pre-other", external_reference: "foreign" }]);
    await expect(reconcileSubscriptionResources({ ...input, paymentModel })).rejects.toThrow("no corresponde");
    expect(mocks.authorized).not.toHaveBeenCalled();
    expect(mocks.payment).not.toHaveBeenCalled();
  });
  it("página parcial no se informa como reconciliación completa", async () => {
    respond([{ id: "invoice-1", preapproval_id: "pre-1" }], 2);
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("incompleto");
  });
  it("pagina con el límite 12 devuelto por facturas y no pierde la segunda página", async () => {
    respond(Array.from({ length: 12 }, (_, n) => ({ id: `invoice-${n}`, preapproval_id: "pre-1" })), 13);
    respond([{ id: "invoice-12", preapproval_id: "pre-1" }], 13, 12);
    await expect(reconcileSubscriptionResources(input)).resolves.toEqual({ reconciled: 13 });
    expect(mocks.authorized).toHaveBeenCalledTimes(13);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("offset=12");
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.has("limit")).toBe(false);
  });
  it("conserva páginas de 50 en pago único", async () => {
    respond(Array.from({ length: 50 }, (_, n) => ({ id: n, external_reference: input.subscriptionId })), 51, 0, 50);
    respond([{ id: 50, external_reference: input.subscriptionId }], 51, 50, 50);
    await expect(reconcileSubscriptionResources({ ...input, paymentModel: "ONE_TIME" })).resolves.toEqual({ reconciled: 51 });
    const url = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("offset")).toBe("50");
  });
  it("acepta un historial vacío completo", async () => {
    respond([]);
    await expect(reconcileSubscriptionResources(input)).resolves.toEqual({ reconciled: 0 });
    expect(mocks.authorized).not.toHaveBeenCalled();
  });
  it.each([
    { total: 1, offset: 0 },
    { total: 1, offset: 0, limit: 0 },
    { total: 1, offset: 0, limit: -1 },
    { total: 1, offset: 0, limit: 1.5 },
    { total: 1, offset: 0, limit: 1001 },
    { total: 1, offset: 1, limit: 12 },
    { total: 0, offset: 0, limit: 12 },
  ])("rechaza paginación inválida antes de reconciliar facturas: %j", async (paging) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ paging, results: [{ id: "invoice-1", preapproval_id: "pre-1" }] })));
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow();
    expect(mocks.authorized).not.toHaveBeenCalled();
  });
  it("rechaza una página con más resultados que su límite", async () => {
    respond([{ id: "i-1", preapproval_id: "pre-1" }, { id: "i-2", preapproval_id: "pre-1" }], 2, 0, 1);
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("Paginación");
    expect(mocks.authorized).not.toHaveBeenCalled();
  });
  it("no declara éxito si el proveedor repite la página anterior", async () => {
    respond([{ id: "i-1", preapproval_id: "pre-1" }], 2, 0, 1);
    respond([{ id: "i-1", preapproval_id: "pre-1" }], 2, 1, 1);
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("no avanza");
    expect(mocks.authorized).toHaveBeenCalledTimes(1);
  });
  it("no declara éxito al alcanzar el tope operativo con historia pendiente", async () => {
    respond(Array.from({ length: 1000 }, (_, n) => ({ id: `i-${n}`, preapproval_id: "pre-1" })), 1001, 0, 1000);
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("por lotes");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([400, 429])("no reintenta automáticamente el error %i", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("omitted", { status }));
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("No se pudo consultar");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.authorized).not.toHaveBeenCalled();
  });
  it("fallo de recurso o proveedor no devuelve éxito", async () => {
    respond([{ id: "invoice-1", preapproval_id: "pre-1" }]);
    mocks.authorized.mockRejectedValue(new Error("persistencia fallida"));
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("persistencia fallida");
    fetchMock.mockResolvedValueOnce(new Response("provider response omitted", { status: 503 }));
    await expect(reconcileSubscriptionResources(input)).rejects.toThrow("No se pudo consultar");
  });
});
