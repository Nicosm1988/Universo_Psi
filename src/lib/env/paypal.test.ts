import { expect, it } from "vitest";
import { z } from "zod";
import { paypalEnvFields, paypalPlansSchema } from "./paypal";
it("valida entorno al arrancar", () => {
  const schema = z.object(paypalEnvFields);
  expect(schema.parse({}).PAYPAL_ENV).toBe("sandbox");
  expect(schema.safeParse({ PAYPAL_ENV: "production" }).success).toBe(false);
  expect(schema.parse({ PAYPAL_ENV: "live" }).PAYPAL_LIVE_CHECKOUT_ENABLED).toBe("false");
});
it("rechaza precios ambiguos y JSON inválido al arrancar", () => {
  const schema = z.object(paypalEnvFields);
  expect(schema.safeParse({ PAYPAL_SANDBOX_PLANS: "invalid" }).success).toBe(false);
  for (const currency of ["ARS", "EUR"]) expect(paypalPlansSchema.safeParse({ PROFESSIONAL_MONTHLY: { currency, amount: "25.00", planId: "P-TEST" } }).success).toBe(false);
  for (const amount of ["25", "0.00", "-25.00", "25,00"]) expect(paypalPlansSchema.safeParse({ PROFESSIONAL_MONTHLY: { currency: "USD", amount, planId: "P-TEST" } }).success).toBe(false);
});
