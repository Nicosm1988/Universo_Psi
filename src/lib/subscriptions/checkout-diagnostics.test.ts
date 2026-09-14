import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/payments", () => ({ MercadoPagoHttpError: class extends Error {} }));
import { checkoutFailure } from "./checkout-diagnostics";

afterEach(() => vi.restoreAllMocks());

describe("diagnóstico de autenticación de checkout", () => {
  it("registra sólo etapa, motivo, estado y código permitido", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    checkoutFailure("authentication", "claims_error", {
      code: "bad_jwt", status: 401, message: "private-token", email: "private@example.invalid", request: { cookie: "private-cookie" },
    });
    expect(log).toHaveBeenCalledWith("mercado_pago_checkout_failed", {
      stage: "authentication", reason: "claims_error", authenticationCode: "bad_jwt", authenticationStatus: 401,
    });
  });
  it("omite códigos no permitidos y estados no HTTP", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    checkoutFailure("authentication", "claims_error", { code: "private-token", status: 200 });
    expect(log).toHaveBeenCalledWith("mercado_pago_checkout_failed", { stage: "authentication", reason: "claims_error" });
  });
});
