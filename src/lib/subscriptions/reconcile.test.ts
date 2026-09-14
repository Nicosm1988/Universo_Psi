import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), verify: vi.fn(), preapproval: vi.fn(), payment: vi.fn(), recurring: vi.fn(), reference: vi.fn(), findInvoice: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), lookup: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/integrations/payments", () => ({ MercadoPagoHttpError: class extends Error {}, fetchRecurringPayment: mocks.recurring, fetchPaymentSubscriptionReference: mocks.reference, findRecurringInvoiceForPayment: mocks.findInvoice, fetchPayment: mocks.payment, fetchPreapproval: mocks.preapproval, verifyPaymentAccountIdentity: mocks.verify, SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS: { pending: null, authorized: null, paused: "PAUSED", cancelled: "CANCELED" } }));

import { reconcileAuthorizedPayment, reconcileOneTimePayment, reconcilePreapproval, reconcilePaymentNotification, reconciliationFailureDetails } from "./reconcile";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const now = "2026-09-11T12:00:00.000Z";
const payment = () => ({ id: "pay-1", status: "approved", externalReference: subscriptionId, amount: 120000, currency: "ARS", dateApproved: now, createdAt: now, modifiedAt: now });
const preapproval = () => ({ id: "pre-1", status: "authorized", externalReference: subscriptionId, amount: 120000, currency: "ARS", modifiedAt: now, nextPaymentDate: "2026-10-11T12:00:00.000Z" });

const linked = () => ({ id: subscriptionId, provider: "MERCADO_PAGO", provider_account: "personal", provider_subscription_id: "pre-1", plan_snapshot: { payment_model: "RECURRING", price_amount: 120000, currency: "ARS" } });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.lookup });
  mocks.lookup.mockResolvedValue({ data: linked(), error: null });
  mocks.reference.mockResolvedValue(subscriptionId);
  mocks.findInvoice.mockResolvedValue("invoice-1");
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue(undefined);
  mocks.preapproval.mockResolvedValue(preapproval());
  mocks.payment.mockResolvedValue(payment());
  mocks.recurring.mockResolvedValue({ preapproval: preapproval(), payment: payment() });
});

describe("reconciliación deriva estado de recursos autenticados", () => {
  it("persiste pago aprobado con emails distintos sin usarlos ni guardarlos", async () => {
    mocks.recurring.mockResolvedValue({
      preapproval: { ...preapproval(), payer_email: "platform@example.invalid" },
      payment: { ...payment(), payer: { email: "mp-buyer@example.invalid" } },
    });
    await reconcileAuthorizedPayment("invoice-1", "personal");
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_payment_event", expect.objectContaining({ p_subscription_id: subscriptionId, p_provider_subscription_id: "pre-1", p_provider_payment_id: "pay-1", p_payment_status: "approved" }));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("@example.invalid");
  });
  it.each(["pending", "authorized"])("consentimiento %s no activa ni cambia período", async (status) => {
    mocks.preapproval.mockResolvedValue({ ...preapproval(), status });
    await reconcilePreapproval("pre-1", "personal");
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_webhook_event", expect.objectContaining({ p_status: null, p_period_start: null, p_period_end: null }));
  });
  it.each([["paused", "PAUSED"], ["cancelled", "CANCELED"]])("propaga %s desde proveedor", async (status, expected) => {
    mocks.preapproval.mockResolvedValue({ ...preapproval(), status });
    await reconcilePreapproval("pre-1", "company");
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_webhook_event", expect.objectContaining({ p_provider_account: "company", p_status: expected }));
  });
  it("factura sin pago no activa beneficios", async () => {
    mocks.recurring.mockResolvedValue(null);
    await reconcileAuthorizedPayment("invoice-1", "personal");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["pending", "rejected", "approved", "refunded", "charged_back"])("usa estado %s del pago y nunca estado de factura", async (status) => {
    mocks.recurring.mockResolvedValue({ preapproval: preapproval(), payment: { ...payment(), status, dateApproved: status === "approved" ? now : null } });
    await reconcileAuthorizedPayment("invoice-1", "personal");
    expect(mocks.recurring).toHaveBeenCalledWith("invoice-1", "personal");
    expect(mocks.payment).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_payment_event", expect.objectContaining({ p_payment_status: status, p_provider_subscription_id: "pre-1", p_subscription_id: subscriptionId, p_amount: 120000, p_currency: "ARS" }));
  });
  it("fallos de identidad o vínculo autenticado impiden toda escritura", async () => {
    mocks.recurring.mockRejectedValue(new Error("identity mismatch"));
    await expect(reconcileAuthorizedPayment("invoice-1", "personal")).rejects.toThrow("identity mismatch");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("dos entregas del mismo recurso conservan clave de deduplicación y payload mínimo", async () => {
    await reconcileAuthorizedPayment("invoice-1", "personal");
    await reconcileAuthorizedPayment("invoice-1", "personal");
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({ p_external_event_id: `personal:payment:pay-1:${now}:approved`, p_payload: { id: "pay-1", status: "approved", date_created: now } });
  });
  it("errores RPC de enlace tardío o persistencia quedan reintentables", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "P0002", message: "not linked yet" } });
    await expect(reconcilePreapproval("pre-1", "personal")).rejects.toThrow("persistence failed");
    await expect(reconcileAuthorizedPayment("invoice-1", "personal")).rejects.toThrow("persistence failed");
    await expect(reconcileOneTimePayment("pay-1", "personal")).rejects.toThrow("persistence failed");
  });
});


describe("topic payment resuelve modelo por vínculo persistido", () => {
  it("recurrente aprobado usa factura verificada, snapshot y RPC recurrente", async () => {
    await reconcilePaymentNotification("pay-1", "personal");
    expect(mocks.eq).toHaveBeenCalledWith("id", subscriptionId);
    expect(mocks.findInvoice).toHaveBeenCalledWith({ paymentId: "pay-1", preapprovalId: "pre-1", subscriptionId, account: "personal" });
    expect(mocks.recurring).toHaveBeenCalledWith("invoice-1", "personal");
    expect(mocks.payment).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_payment_event", expect.objectContaining({ p_provider_subscription_id: "pre-1", p_event_type: "subscription_authorized_payment", p_provider_payment_id: "pay-1", p_paid_at: now }));
  });
  it("entrega repetida y ambos tópicos comparten clave y payload idempotentes", async () => {
    await reconcilePaymentNotification("pay-1", "personal");
    await reconcilePaymentNotification("pay-1", "personal");
    await reconcileAuthorizedPayment("invoice-1", "personal");
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
    expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[2]);
  });
  it.each([null, { ...linked(), provider: "OTHER" }, { ...linked(), provider_account: "company" }, { ...linked(), provider_subscription_id: null }, { ...linked(), id: "20000000-0000-4000-8000-000000000001" }, { ...linked(), plan_snapshot: { ...linked().plan_snapshot, payment_model: "UNKNOWN" } }])("desconocido o vínculo incompatible no llega a RPC %j", async (data) => {
    mocks.lookup.mockResolvedValue({ data, error: null });
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow();
    expect(mocks.findInvoice).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([{ id: "other-payment" }, { externalReference: "20000000-0000-4000-8000-000000000001" }, { amount: 1 }, { currency: "USD" }])("reconsulta no puede sustituir el ID firmado ni snapshot %j", async (change) => {
    mocks.recurring.mockResolvedValue({ preapproval: preapproval(), payment: { ...payment(), ...change } });
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("snapshot");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([null, { preapproval: { ...preapproval(), id: "other-preapproval" }, payment: payment() }])("factura desaparecida o cruzada falla cerrada", async (result) => {
    mocks.recurring.mockResolvedValue(result);
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("linkage");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("búsqueda ambigua no hace fallback al pago único", async () => {
    mocks.findInvoice.mockRejectedValue(new Error("ambiguous"));
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("ambiguous");
    expect(mocks.payment).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("ONE_TIME mantiene adaptador estricto y enlace interno", async () => {
    mocks.lookup.mockResolvedValue({ data: { ...linked(), provider_subscription_id: subscriptionId, plan_snapshot: { ...linked().plan_snapshot, payment_model: "ONE_TIME" } }, error: null });
    await reconcilePaymentNotification("pay-1", "personal");
    expect(mocks.payment).toHaveBeenCalledWith("pay-1", "personal");
    expect(mocks.findInvoice).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("apply_subscription_payment_event", expect.objectContaining({ p_event_type: "payment", p_provider_subscription_id: subscriptionId }));
    mocks.rpc.mockClear();
    mocks.payment.mockRejectedValue(new Error("environment mismatch"));
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("environment mismatch");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("error de lectura o de persistencia no devuelve éxito", async () => {
    mocks.lookup.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("lookup failed");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ error: { code: "P0002" } });
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("persistence failed");
  });
  it("identidad incompatible impide consultar DB", async () => {
    mocks.reference.mockRejectedValue(new Error("identity mismatch"));
    await expect(reconcilePaymentNotification("pay-1", "personal")).rejects.toThrow("identity mismatch");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});


describe("diagnóstico de reconciliación sin datos privados", () => {
  it("conserva código RPC permitido y omite mensaje, detalle e identificadores", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23514", message: "private-payer", details: "private-payment-id" } });
    const error = await reconcileAuthorizedPayment("invoice-1", "personal").catch((failure: unknown) => failure);
    expect(reconciliationFailureDetails(error)).toEqual({ phase: "payment_persistence", databaseCode: "23514" });
    expect(JSON.stringify(error)).not.toContain("private");
  });
  it("código RPC desconocido se omite y nunca devuelve éxito", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "private-token" } });
    const error = await reconcilePreapproval("pre-1", "personal").catch((failure: unknown) => failure);
    expect(reconciliationFailureDetails(error)).toEqual({ phase: "subscription_persistence" });
  });
});
