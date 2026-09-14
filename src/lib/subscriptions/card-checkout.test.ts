import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn(), availability: vi.fn(), account: vi.fn(), verify: vi.fn(), create: vi.fn(), find: vi.fn(), fetch: vi.fn(), cancel: vi.fn(), reconcile: vi.fn(), HttpError: class extends Error { constructor(public status: number) { super("provider"); } } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/subscriptions/reconcile-search", () => ({ reconcileSubscriptionResources: vi.fn() }));
vi.mock("@/lib/subscriptions/reconcile", () => ({ reconcilePreapproval: mocks.reconcile }));
vi.mock("@/lib/subscriptions/checkout-diagnostics", () => ({ checkoutFailure: () => null }));
vi.mock("@/lib/integrations/payments", () => ({ activePaymentAccountKey: () => "personal", resolvePaymentAccount: mocks.account, paymentAvailability: mocks.availability, verifyPaymentAccountIdentity: mocks.verify, createCardSubscription: mocks.create, findSubscriptionCheckout: mocks.find, fetchPreapproval: mocks.fetch, MercadoPagoHttpError: mocks.HttpError, cancelPendingPreapproval: mocks.cancel }));

import { createEmbeddedCheckoutRedirectUrl, restartPendingCardCheckout, submitCardSubscription } from "./checkout";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const profileId = "20000000-0000-4000-8000-000000000001";
const attemptId = "30000000-0000-4000-8000-000000000001";
const snapshot = { code: "PROFESSIONAL_MONTHLY", price_amount: 120000, currency: "ARS", pricing_status: "PUBLISHED", payment_model: "RECURRING" };
const row = () => ({ plan_snapshot: snapshot, status: "PENDING_PAYMENT", provider_account: null, provider_subscription_id: null, provider_plan_id: null });
const input = { subscriptionId, payerEmail: "payer@example.invalid", cardTokenId: "single-use-card-token", consent: true as const };
const query = { select: () => query, eq: () => query, maybeSingle: mocks.read };
const client = { from: () => query, rpc: mocks.rpc } as unknown as SupabaseClient;
const provider = () => ({ id: "pre-1", status: "authorized", externalReference: subscriptionId, amount: 120000, currency: "ARS" });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({ data: row(), error: null });
  mocks.account.mockReturnValue({ publicKey: "public-sandbox-key" });
  mocks.availability.mockReturnValue({ configured: true });
  mocks.create.mockResolvedValue(provider());
  mocks.find.mockResolvedValue(null);
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "reserve_card_checkout" ? [{ may_create: true, attempt_id: attemptId }] : null, error: null }));
});

describe("checkout embebido sin cobros reales", () => {
  it("visitar checkout no crea ni reserva proveedor y no exige email de acceso", async () => {
    expect(await createEmbeddedCheckoutRedirectUrl(client, { subscriptionId, profileId })).toBe(`/dashboard/suscripcion/pagar?subscriptionId=${subscriptionId}&checkout=card`);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("usa email del pagador independiente y conserva identidad por UUID; authorized sigue pendiente", async () => {
    expect(await submitCardSubscription(client, profileId, input)).toEqual({ status: "PENDING_PAYMENT" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ payerEmail: input.payerEmail, subscriptionId, cardTokenId: input.cardTokenId, amount: 120000 }));
    expect(mocks.rpc).toHaveBeenLastCalledWith("attach_subscription_checkout", expect.objectContaining({ p_subscription_id: subscriptionId, p_provider_subscription_id: "pre-1" }));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(input.cardTokenId);
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(input.payerEmail);
  });
  it("falla enlace no devuelve autorización exitosa", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "attach_subscription_checkout" ? { error: { code: "P0002" } } : { data: name === "reserve_card_checkout" ? [{ may_create: true, attempt_id: attemptId }] : null });
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow("attachment");
  });
  it.each([400, 422])("libera sólo lease propio tras rechazo definitivo %s", async (status) => {
    mocks.create.mockRejectedValue(new mocks.HttpError(status));
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow();
    expect(mocks.rpc).toHaveBeenLastCalledWith("release_failed_card_checkout", { p_subscription_id: subscriptionId, p_attempt_id: attemptId, p_http_status: status });
  });
  it.each([408, 409, 429, 500, 502])("conserva reserva ante respuesta incierta %s", async (status) => {
    mocks.create.mockRejectedValue(new mocks.HttpError(status));
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow();
    expect(mocks.rpc.mock.calls.some(([name]) => name === "release_failed_card_checkout")).toBe(false);
  });
  it("reintento concurrente recupera autorización y no hace otro POST", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "reserve_card_checkout" ? [{ may_create: false, attempt_id: null }] : null, error: null }));
    mocks.find.mockResolvedValue(provider());
    await expect(submitCardSubscription(client, profileId, input)).resolves.toEqual({ status: "PENDING_PAYMENT" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reintento incierto sin recurso no repite POST", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "reserve_card_checkout" ? [{ may_create: false, attempt_id: null }] : null, error: null }));
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow("Uncertain");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rechaza DRAFT y ausencia de public key sin reservar", async () => {
    mocks.read.mockResolvedValueOnce({ data: { ...row(), plan_snapshot: { ...snapshot, pricing_status: "DRAFT" } } });
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow();
    mocks.account.mockReturnValue({});
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("legacy pendiente no recibe otra autorización ni se cancela silenciosamente", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal", provider_subscription_id: "pre-1" } });
    mocks.fetch.mockResolvedValue({ ...provider(), status: "pending" });
    await expect(submitCardSubscription(client, profileId, input)).rejects.toThrow("recovery");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("no reinicia legado que ya está autorizado", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal", provider_subscription_id: "pre-1" } });
    mocks.fetch.mockResolvedValue(provider());
    await expect(restartPendingCardCheckout(client, subscriptionId, profileId)).rejects.toThrow();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
