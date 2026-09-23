import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), rpc: vi.fn(), select: vi.fn(), read: vi.fn(), checkout: vi.fn(),
  HttpError: class extends Error {},
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/dal/auth", () => ({ requireCurrentUser: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/subscriptions/checkout", () => ({ createHostedCheckoutRedirectUrl: mocks.checkout }));
vi.mock("@/lib/integrations/payments", () => ({ MercadoPagoHttpError: mocks.HttpError }));

import { retrySubscriptionCheckoutAction } from "./subscription-actions";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const profileId = "20000000-0000-4000-8000-000000000001";
function form() {
  const data = new FormData();
  data.set("subscriptionId", subscriptionId);
  data.set("profileId", "30000000-0000-4000-8000-000000000001");
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "owner", email: "fixture@example.invalid" });
  mocks.rpc.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ maybeSingle: mocks.read });
  mocks.read.mockResolvedValue({ data: { id: profileId }, error: null });
  mocks.checkout.mockResolvedValue("/dashboard/suscripcion/pagar?subscriptionId=fixture");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("retomar checkout con el perfil propio", () => {
  it("resuelve el dueño por RPC de sesión y nunca confía en el perfil del formulario", async () => {
    await expect(retrySubscriptionCheckoutAction(form())).rejects.toThrow("redirect:/dashboard/suscripcion/pagar?subscriptionId=fixture");
    expect(mocks.auth).toHaveBeenCalledExactlyOnceWith("/dashboard");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("my_professional_profile");
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith("id");
    expect(mocks.checkout).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      subscriptionId, profileId,
    });
    expect(mocks.auth.mock.invocationCallOrder[0]!).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]!);
  });

  it.each([null, undefined, "platform@example.invalid"])("autenticación con email %s no condiciona ni predefine pagador", async (email) => {
    mocks.auth.mockResolvedValue({ id: "owner", email });
    await expect(retrySubscriptionCheckoutAction(form())).rejects.toThrow("redirect:/dashboard/suscripcion/pagar?subscriptionId=fixture");
    expect(mocks.checkout).toHaveBeenCalledExactlyOnceWith(expect.anything(), { subscriptionId, profileId });
  });

  it.each([
    { data: null, error: null },
    { data: { id: profileId }, error: { code: "42501", message: "private-secret" } },
  ])("no inicia checkout si la RPC no acredita el perfil propio", async (response) => {
    mocks.read.mockResolvedValue(response);
    await expect(retrySubscriptionCheckoutAction(form())).rejects.toThrow("redirect:/dashboard?subscription=checkout-error");
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("mercado_pago_checkout_failed", {
      stage: "action_profile", reason: response.error ? "database_error" : "missing_profile",
      ...(response.error ? { databaseCode: "42501" } : {}),
    });
  });

  it("distingue input inválido antes de autenticación y acceso externo", async () => {
    const input = form();
    input.set("subscriptionId", "private-invalid-value");
    await expect(retrySubscriptionCheckoutAction(input)).rejects.toThrow("redirect:/dashboard?subscription=checkout-error");
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("mercado_pago_checkout_failed", { stage: "action_input", reason: "invalid_input" });
  });
});
