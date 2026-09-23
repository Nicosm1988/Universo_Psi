import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), api: vi.fn(), resource: vi.fn(), create: vi.fn(), plan: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/env/server", () => ({ serverEnv: { PAYPAL_ENV: "sandbox" } }));
vi.mock("@/lib/env/public", () => ({ publicEnv: {} }));
vi.mock("@/lib/integrations/paypal", async importOriginal => ({ ...await importOriginal<object>(), paypalApi: mocks.api, fetchPayPalResource: mocks.resource, assertPayPalPlan: mocks.plan, createPayPalResource: mocks.create }));
import { processPayPalEvent } from "./paypal";
const op = { subscription_id: "10000000-0000-4000-8000-000000000001", external_reference: "20000000-0000-4000-8000-000000000001", payment_model: "RECURRING", price: { amount: "25.00", currency: "USD", planId: "P-TEST" }, provider_subscription_id: "I-TEST", provider_order_id: null, created_at: "2026-09-13T12:00:00Z" };
const sub = { id: "I-TEST", custom_id: op.external_reference, plan_id: "P-TEST", status: "ACTIVE", subscriber: { email_address: "paypal-different@example.test" }, billing_info: { last_payment: { amount: { currency_code: "USD", value: "25.00" }, time: "2026-09-13T12:00:00Z" }, next_billing_time: "2026-10-13T12:00:00Z" } };
const event = { id: "WH-EVENT", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-TEST" } };
const transaction = { id: "SALE-1", status: "COMPLETED", time: "2026-09-13T12:00:00.000Z", amount_with_breakdown: { gross_amount: { currency_code: "USD", value: "25.00" } } };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-13T12:10:00Z")); vi.clearAllMocks();
  mocks.rpc.mockImplementation((_name, args) => Promise.resolve({ data: args.p_action === "lookup" ? op : {}, error: null }));
  mocks.resource.mockResolvedValue(sub); mocks.api.mockResolvedValue({ transactions: [transaction] });
});
afterEach(() => vi.useRealTimers());
it("activa sólo tras verificar referencia, plan y transacción; ignora email", async () => {
  await processPayPalEvent(event);
  expect(mocks.rpc).toHaveBeenLastCalledWith("paypal_operation", expect.objectContaining({ p_action: "event", p_data: expect.objectContaining({ status: "ACTIVE", resource_id: "I-TEST", amount: "25.00" }) }));
});
it("approved o ACTIVE sin transacción pagada no habilita membresía", async () => {
  mocks.api.mockResolvedValue({ transactions: [] }); await processPayPalEvent(event);
  expect(mocks.rpc).toHaveBeenLastCalledWith("paypal_operation", expect.objectContaining({ p_data: expect.objectContaining({ status: "PENDING_PAYMENT" }) }));
});
it.each([{ custom_id: "30000000-0000-4000-8000-000000000001" }, { plan_id: "P-OTHER" }, { id: "I-OTHER" }])("rechaza identidad ajena %j", async change => {
  mocks.resource.mockResolvedValue({ ...sub, ...change }); await expect(processPayPalEvent(event)).rejects.toThrow("mismatch"); expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it("importe distinto no habilita membresía", async () => {
  mocks.api.mockResolvedValue({ transactions: [{ ...transaction, amount_with_breakdown: { gross_amount: { currency_code: "USD", value: "1.00" } } }] }); await processPayPalEvent(event);
  expect(mocks.rpc).toHaveBeenLastCalledWith("paypal_operation", expect.objectContaining({ p_data: expect.objectContaining({ status: "PENDING_PAYMENT" }) }));
});
it("webhook antes de attach conserva reintento", async () => { mocks.rpc.mockResolvedValue({ data: null }); await expect(processPayPalEvent(event)).rejects.toThrow(); });
it.each([["CANCELLED", "CANCELED"], ["SUSPENDED", "PAUSED"], ["EXPIRED", "EXPIRED"]])("mapea %s a %s consultado en API", async (provider, status) => {
  mocks.resource.mockResolvedValue({ ...sub, status: provider }); await processPayPalEvent(event);
  expect(mocks.rpc).toHaveBeenLastCalledWith("paypal_operation", expect.objectContaining({ p_data: expect.objectContaining({ status }) }));
});
it("captura orden aprobada sólo en webhook y vuelve a consultar el capture", async () => {
  mocks.rpc.mockImplementation((_name, args) => Promise.resolve({ data: args.p_action === "lookup" ? { ...op, payment_model: "ONE_TIME", provider_subscription_id: null, provider_order_id: "O-TEST" } : {}, error: null }));
  const unit = { custom_id: op.external_reference, amount: { currency_code: "USD", value: "25.00" } };
  const capture = { id: "C-TEST", status: "COMPLETED", amount: unit.amount, create_time: "2026-09-13T12:00:00Z" };
  mocks.resource.mockResolvedValueOnce({ id: "O-TEST", intent: "CAPTURE", status: "APPROVED", purchase_units: [unit] }).mockResolvedValueOnce({ id: "O-TEST", intent: "CAPTURE", status: "COMPLETED", purchase_units: [{ ...unit, payments: { captures: [capture] } }] });
  mocks.api.mockResolvedValueOnce({}).mockResolvedValueOnce(capture);
  await processPayPalEvent({ ...event, event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "O-TEST" } });
  expect(mocks.api).toHaveBeenNthCalledWith(1, "/v2/checkout/orders/O-TEST/capture", {}, op.external_reference);
  expect(mocks.api).toHaveBeenNthCalledWith(2, "/v2/payments/captures/C-TEST");
  expect(mocks.rpc).toHaveBeenLastCalledWith("paypal_operation", expect.objectContaining({ p_data: expect.objectContaining({ status: "ACTIVE", period_end: "2027-09-13T12:00:00.000Z" }) }));
});
it("pago completado aún no visible en API queda reintentable, sin consumir event ID", async () => {
  mocks.api.mockResolvedValue({ transactions: [] });
  await expect(processPayPalEvent({ ...event, event_type: "PAYMENT.SALE.COMPLETED", resource: { id: "SALE-1", billing_agreement_id: "I-TEST" } })).rejects.toThrow("retry webhook");
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
