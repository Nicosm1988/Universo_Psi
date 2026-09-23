import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnv: env }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://psi.example" } }));
import { approvalLink, assertPayPalPlan, createPayPalResource, paypalApi, paypalConfigured, paypalPrice, verifyPayPalWebhook } from "./paypal";
const fetchMock = vi.fn<typeof fetch>();
const reply = (value: unknown) => fetchMock.mockResolvedValueOnce(Response.json(value));
const price = { amount: "25.00", currency: "USD" as const, planId: "P-TEST" };
beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, { PAYPAL_ENV: "sandbox", PAYPAL_SANDBOX_CLIENT_ID: "test-client", PAYPAL_SANDBOX_CLIENT_SECRET: "test-secret", PAYPAL_SANDBOX_WEBHOOK_ID: "WH-TEST", PAYPAL_SANDBOX_PLANS: JSON.stringify({ PROFESSIONAL_MONTHLY: price }) });
  vi.stubEnv("VERCEL_ENV", "preview"); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("PayPal aislado", () => {
  it.each(["production", "live", "invalid"])("rechaza entorno %s antes de OAuth", async value => {
    env.PAYPAL_ENV = value; expect(paypalConfigured()).toBe(false);
    await expect(paypalApi("/v1/billing/plans")).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rechaza Vercel Production incluso con Sandbox", () => { vi.stubEnv("VERCEL_ENV", "production"); expect(paypalConfigured()).toBe(false); });
  it("no inventa un precio ni convierte ARS", () => {
    expect(paypalPrice("unknown")).toBeNull(); env.PAYPAL_SANDBOX_PLANS = '{"PROFESSIONAL_MONTHLY":{"amount":"120000.00","currency":"ARS"}}';
    expect(paypalPrice("PROFESSIONAL_MONTHLY")).toBeNull();
  });
  it("crea suscripción por referencia opaca sin enviar email ni tarjeta", async () => {
    reply({ access_token: "test-token" }); reply({ id: "I-TEST", status: "APPROVAL_PENDING" });
    const reference = "10000000-0000-4000-8000-000000000001";
    await createPayPalResource(reference, price, "RECURRING");
    const call = fetchMock.mock.calls[1]!;
    expect(call[0]).toBe("https://api-m.sandbox.paypal.com/v1/billing/subscriptions");
    expect(JSON.parse(call[1]!.body as string)).toMatchObject({ custom_id: reference, plan_id: "P-TEST" });
    expect(call[1]!.body).not.toMatch(/email|card|subscriber/);
    expect(call[1]!.headers).toMatchObject({ "PayPal-Request-Id": reference });
  });
  it("crea orden anual con CAPTURE y custom_id", async () => {
    reply({ access_token: "test" }); reply({ id: "O-TEST", status: "CREATED" });
    await createPayPalResource("10000000-0000-4000-8000-000000000001", price, "ONE_TIME");
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toMatchObject({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: "USD", value: "25.00" } }] });
  });
  it.each(["https://www.paypal.com/approve", "https://www.sandbox.paypal.com.evil.test/", "https://evil@www.sandbox.paypal.com/"])("rechaza redirección %s", url => {
    expect(() => approvalLink({ id: "I-test", status: "CREATED", links: [{ rel: "approve", href: url }] })).toThrow();
  });
  it("valida firma por método oficial con payload original", async () => {
    const headers = new Headers({ "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/test", "paypal-transmission-id": "test", "paypal-transmission-sig": "test", "paypal-transmission-time": "2026-09-13T12:00:00Z" });
    const event = { id: "WH-1", resource: { subscriber: { email_address: "different@example.test" } } };
    reply({ access_token: "test" }); reply({ verification_status: "SUCCESS" });
    expect(await verifyPayPalWebhook(headers, event)).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toMatchObject({ webhook_id: "WH-TEST", webhook_event: event });
  });
  it("no procesa firma sin cabeceras", async () => { expect(await verifyPayPalWebhook(new Headers(), {})).toBe(false); expect(fetchMock).not.toHaveBeenCalled(); });
  it("rechaza precio mensual distinto aunque el ID sea correcto", async () => {
    reply({ access_token: "test" }); reply({ id: "P-TEST", status: "ACTIVE", billing_cycles: [{ tenure_type: "REGULAR", total_cycles: 0, frequency: { interval_unit: "MONTH", interval_count: 1 }, pricing_scheme: { fixed_price: { currency_code: "USD", value: "99.00" } } }], payment_preferences: { auto_bill_outstanding: false } });
    await expect(assertPayPalPlan(price)).rejects.toThrow("mismatch");
  });
});
it("Live incompleto y Live no autorizado permanecen cerrados", () => {
  vi.stubEnv("VERCEL_ENV", "production"); env.PAYPAL_ENV = "live";
  expect(paypalConfigured()).toBe(false);
  Object.assign(env, { PAYPAL_LIVE_CLIENT_ID: "live-client", PAYPAL_LIVE_CLIENT_SECRET: "live-secret", PAYPAL_LIVE_WEBHOOK_ID: "WH-LIVE", PAYPAL_LIVE_PLANS: JSON.stringify({ PROFESSIONAL_MONTHLY: price }) });
  expect(paypalConfigured()).toBe(false);
  expect(paypalConfigured(false)).toBe(true);
  env.PAYPAL_LIVE_CHECKOUT_ENABLED = "true"; expect(paypalConfigured()).toBe(true);
  env.PAYPAL_LIVE_CLIENT_ID = env.PAYPAL_SANDBOX_CLIENT_ID!; expect(paypalConfigured()).toBe(false);
});
it("OAuth Live usa sólo credenciales Live y no hace POST de pago si falla", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  Object.assign(env, { PAYPAL_ENV: "live", PAYPAL_LIVE_CHECKOUT_ENABLED: "true", PAYPAL_LIVE_CLIENT_ID: "live-client", PAYPAL_LIVE_CLIENT_SECRET: "live-secret", PAYPAL_LIVE_WEBHOOK_ID: "WH-LIVE", PAYPAL_LIVE_PLANS: JSON.stringify({ PROFESSIONAL_MONTHLY: price }) });
  fetchMock.mockResolvedValueOnce(new Response(null, {status:401}));
  await expect(createPayPalResource("10000000-0000-4000-8000-000000000001",price,"RECURRING")).rejects.toThrow("authentication");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0]![0]).toBe("https://api-m.paypal.com/v1/oauth2/token");
  expect(fetchMock.mock.calls[0]![1]!.headers).toMatchObject({Authorization:`Basic ${Buffer.from('live-client:live-secret').toString('base64')}`});
});
