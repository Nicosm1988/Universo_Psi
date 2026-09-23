import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn(), eq: vi.fn(), availability: vi.fn(), verify: vi.fn(), create: vi.fn(), oneTime: vi.fn(), findOneTime: vi.fn(), find: vi.fn(), fetch: vi.fn(), matches: vi.fn(), reconcile: vi.fn(), HttpError: class extends Error { constructor(message: string, public status: number) { super(message); } } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/subscriptions/reconcile-search", () => ({ reconcileSubscriptionResources: mocks.reconcile }));
vi.mock("@/lib/integrations/payments", () => ({ MercadoPagoHttpError: mocks.HttpError, activePaymentAccountKey: () => "personal", assertCheckoutMatches: mocks.matches, createOneTimeCheckout: mocks.oneTime, findOneTimeCheckout: mocks.findOneTime, createSubscriptionCheckout: mocks.create, fetchPreapproval: mocks.fetch, findSubscriptionCheckout: mocks.find, paymentAvailability: mocks.availability, verifyPaymentAccountIdentity: mocks.verify }));

import { createCheckoutRedirectUrl } from "./checkout";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const profileId = "20000000-0000-4000-8000-000000000001";
const params = { subscriptionId, profileId, payerEmail: "mp-buyer@example.invalid" };
const snapshot = { code: "PROFESSIONAL_MONTHLY", price_amount: 120000, currency: "ARS", pricing_status: "PUBLISHED", payment_model: "RECURRING" };
const row = () => ({ plan_snapshot: snapshot, status: "PENDING_PAYMENT", provider_account: null, provider_subscription_id: null, provider_plan_id: null });
const redirect = "https://www.mercadopago.com.ar/subscriptions/checkout?id=pre-1";
const query = { select: () => query, eq: mocks.eq, maybeSingle: mocks.read };
const client = { from: () => query } as unknown as SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockReturnValue(query);
  mocks.read.mockResolvedValue({ data: row(), error: null });
  mocks.availability.mockReturnValue({ configured: true });
  mocks.verify.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue({ accountKey: "personal", providerSubscriptionId: "pre-1", initPoint: redirect });
  mocks.oneTime.mockResolvedValue({ accountKey: "personal", providerSubscriptionId: "preference-1", initPoint: redirect });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "begin_subscription_checkout" ? true : null, error: null }));
  mocks.find.mockResolvedValue(null);
  mocks.findOneTime.mockResolvedValue(null);
  mocks.matches.mockReturnValue(undefined);
  mocks.reconcile.mockResolvedValue({ reconciled: 0 });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("checkout durable con cliente sujeto a RLS", () => {
  it("enlaza perfil y snapshot antes de devolver URL", async () => {
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe(redirect);
    expect(mocks.eq).toHaveBeenCalledWith("id", subscriptionId);
    expect(mocks.eq).toHaveBeenCalledWith("professional_profile_id", profileId);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 120000, currency: "ARS", subscriptionId }));
    expect(mocks.rpc).toHaveBeenLastCalledWith("attach_subscription_checkout", expect.objectContaining({ p_subscription_id: subscriptionId, p_provider_subscription_id: "pre-1", p_expected_plan_snapshot: snapshot }));
  });
  it.each([null, { ...row(), status: "ACTIVE" }, { ...row(), plan_snapshot: { ...snapshot, pricing_status: "DRAFT" } }, { ...row(), plan_snapshot: { ...snapshot, price_amount: null } }])("no crea pago para selección inexistente/no cobrable", async (data) => {
    mocks.read.mockResolvedValue({ data, error: null });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("no crea pago si falla la lectura autorizada", async () => {
    mocks.read.mockResolvedValue({ data: row(), error: { code: "42501", message: "private-payer-details", details: params.payerEmail } });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("mercado_pago_checkout_failed", { stage: "subscription_read", reason: "database_error", databaseCode: "42501" });
  });
  it("informa sólo etapa y HTTP status si falla verificar la cuenta", async () => {
    mocks.verify.mockRejectedValueOnce(new mocks.HttpError("private-provider-body", 403));
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("mercado_pago_checkout_failed", { stage: "account_identity", reason: "operation_failed", providerStatus: 403 });
  });
  it("descarta códigos desconocidos y detalles privados del error RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "private-secret", message: params.payerEmail } });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("mercado_pago_checkout_failed", { stage: "plan_lookup", reason: "database_error" });
  });
  it.each([{ ...params, subscriptionId: "invalid" }, { ...params, profileId: "invalid" }])("rechaza identidad de entrada inválida", async (input) => {
    await expect(createCheckoutRedirectUrl(client, input)).resolves.toBeNull();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it.each([null, undefined, "platform@example.invalid"])("email de acceso %s no condiciona checkout recurrente", async (email) => {
    const request = { ...params, email };
    await expect(createCheckoutRedirectUrl(client, request)).resolves.toBe(redirect);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ payerEmail: params.payerEmail, subscriptionId }));
    expect(JSON.stringify(mocks.create.mock.calls)).not.toContain("platform@example.invalid");
  });
  it("pago único se crea sin ningún email", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), plan_snapshot: { ...snapshot, payment_model: "ONE_TIME" } }, error: null });
    await expect(createCheckoutRedirectUrl(client, { subscriptionId, profileId })).resolves.toBe(redirect);
    expect(mocks.oneTime).toHaveBeenCalledWith(expect.not.objectContaining({ payerEmail: expect.anything() }));
  });
  it("configuración ausente no produce redirección ni escritura", async () => {
    mocks.availability.mockReturnValue({ configured: false });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["lookup_plan_provider_id", "begin_subscription_checkout", "attach_subscription_checkout"])("error RPC %s no devuelve éxito falso", async (failed) => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "begin_subscription_checkout" ? true : null, error: name === failed ? { message: "fixture failure" } : null }));
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
  });
  it("respuesta incierta del proveedor no vuelve a crear en el reintento", async () => {
    mocks.create.mockRejectedValueOnce(new Error("timeout after provider accepted"));
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal" }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.find.mockResolvedValue({ id: "pre-1", initPoint: redirect });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe(redirect);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.find).toHaveBeenCalledWith(subscriptionId, "personal");
    expect(mocks.matches).toHaveBeenCalled();
  });
  it("fallo de enlace recupera recurso existente sin repetir POST", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "begin_subscription_checkout" ? true : null, error: name === "attach_subscription_checkout" ? { message: "offline" } : null }));
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal" }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.find.mockResolvedValue({ id: "pre-1", initPoint: redirect });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe(redirect);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("reserva tomada sin recurso recuperable no dispara segundo POST", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reintento conserva cuenta histórica company frente a activa personal", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "company", provider_subscription_id: "pre-old" }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.fetch.mockResolvedValue({ id: "pre-old", initPoint: redirect });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe(redirect);
    expect(mocks.verify).toHaveBeenCalledWith("company");
    expect(mocks.fetch).toHaveBeenCalledWith("pre-old", "company");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("pago único incierto queda para reconciliación del operador", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), plan_snapshot: { ...snapshot, payment_model: "ONE_TIME" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.oneTime).not.toHaveBeenCalled();
    expect(mocks.findOneTime).toHaveBeenCalled();
  });
  it("pago único recuperado guarda preferencia sin crear otra", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal", plan_snapshot: { ...snapshot, payment_model: "ONE_TIME" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.findOneTime.mockResolvedValue({ providerSubscriptionId: "preference-1", initPoint: redirect });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe(redirect);
    expect(mocks.oneTime).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenLastCalledWith("attach_subscription_checkout", expect.objectContaining({ p_provider_plan_id: "preference-1", p_provider_subscription_id: subscriptionId }));
  });
  it("consentimiento ya autorizado se enlaza y reconcilia sin segundo checkout", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal" }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.find.mockResolvedValue({ id: "pre-1", status: "authorized", initPoint: redirect });
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBe("/dashboard?subscription=checkout-return");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.reconcile).toHaveBeenCalledExactlyOnceWith({ subscriptionId, providerSubscriptionId: "pre-1", accountKey: "personal", paymentModel: "RECURRING" });
    const attachOrder = mocks.rpc.mock.invocationCallOrder.at(-1)!;
    expect(attachOrder).toBeLessThan(mocks.reconcile.mock.invocationCallOrder[0]!);
  });
  it("recuperación ya autorizada con error de reconciliación no devuelve éxito falso", async () => {
    mocks.read.mockResolvedValue({ data: { ...row(), provider_account: "personal" }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.find.mockResolvedValue({ id: "pre-1", status: "authorized", initPoint: redirect });
    mocks.reconcile.mockRejectedValue(new Error("payment fetch unavailable"));
    await expect(createCheckoutRedirectUrl(client, params)).resolves.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
