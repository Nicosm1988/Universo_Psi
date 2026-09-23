import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnv: env }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://psi.example" } }));

import { assertCheckoutMatches, createOneTimeCheckout, createSubscriptionCheckout, fetchPayment, fetchPreapproval, fetchRecurringPayment, fetchPaymentSubscriptionReference, findRecurringInvoiceForPayment, findOneTimeCheckout, findSubscriptionCheckout, paymentAvailability, resolvePaymentAccount, SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS, verifyMercadoPagoSignature, verifyPaymentAccountIdentity } from "./payments";

const subscriptionId = "10000000-0000-4000-8000-000000000001";
const now = "2026-09-11T12:00:00.000Z";
const providerPreapproval = () => ({ id: "preapproval-1", collector_id: "101", external_reference: subscriptionId, status: "pending", init_point: "https://www.mercadopago.com.ar/subscriptions/checkout?id=preapproval-1", last_modified: now, auto_recurring: { transaction_amount: 120000, currency_id: "ARS", frequency: 1, frequency_type: "months" } });
const providerPayment = () => ({ id: "123", collector_id: "101", external_reference: subscriptionId, live_mode: false, status: "approved", transaction_amount: 120000, currency_id: "ARS", date_created: now, date_approved: now, date_last_updated: now });
const fetchMock = vi.fn<typeof fetch>();
const respond = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, { MERCADOPAGO_CHECKOUT_ENABLED: "true", MERCADOPAGO_ACTIVE_ACCOUNT: "personal", MERCADOPAGO_PERSONAL_ACCESS_TOKEN: "test-only-personal", MERCADOPAGO_PERSONAL_WEBHOOK_SECRET: "unit-test-personal", MERCADOPAGO_PERSONAL_COLLECTOR_ID: "101", MERCADOPAGO_PERSONAL_ENVIRONMENT: "sandbox", MERCADOPAGO_COMPANY_ACCESS_TOKEN: "test-only-company", MERCADOPAGO_COMPANY_WEBHOOK_SECRET: "unit-test-company", MERCADOPAGO_COMPANY_COLLECTOR_ID: "202", MERCADOPAGO_COMPANY_ENVIRONMENT: "production" });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("firma Mercado Pago (sintética; no acredita sandbox)", () => {
  function signed(ts = String(Date.now()), dataId = "ABC123", requestId = "request-1") {
    const v1 = createHmac("sha256", "unit-test-personal").update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
    return { signatureHeader: `ts=${ts},v1=${v1}`, requestId, dataId, accountKey: "personal" as const };
  }
  it("acepta ID normalizado, timestamps segundos/milisegundos y reentrega histórica", () => {
    expect(verifyMercadoPagoSignature(signed())).toBe(true);
    expect(verifyMercadoPagoSignature(signed(String(Math.floor(Date.now() / 1000))))).toBe(true);
    expect(verifyMercadoPagoSignature(signed("1700000000"))).toBe(true);
  });
  it("rechaza datos o cuenta alterados y timestamps futuros", () => {
    expect(verifyMercadoPagoSignature({ ...signed(), dataId: "other" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...signed(), requestId: "other" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...signed(), accountKey: "company" })).toBe(false);
    expect(verifyMercadoPagoSignature(signed(String(Date.now() + 600_000)))).toBe(false);
  });
  it.each([null, "", "ts=1700000000,v1=zz", "ts=1700000000,v1=" + "a".repeat(63), "ts=1700000000,ts=1700000000,v1=" + "a".repeat(64)])("rechaza firma malformada %s", (signatureHeader) => {
    expect(verifyMercadoPagoSignature({ ...signed(), signatureHeader })).toBe(false);
  });
  it("rechaza request-id ausente o con delimitadores", () => {
    expect(verifyMercadoPagoSignature({ ...signed(), requestId: null })).toBe(false);
    expect(verifyMercadoPagoSignature(signed(undefined, "ABC123", "a;ts:1"))).toBe(false);
  });
});

describe("contratos autenticados del proveedor", () => {
  it.each(["canceled", "cancelled"])("normaliza cancelación %s al estado canónico para RPC", async (status) => {
    respond({ ...providerPreapproval(), status });
    const value = await fetchPreapproval("preapproval-1", "personal");
    expect(value.status).toBe("cancelled");
    expect(SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[value.status]).toBe("CANCELED");
  });
  it.each(["cancel", "CANCELED", "expired", "unknown"])("rechaza estado de suscripción desconocido %s", async (status) => {
    respond({ ...providerPreapproval(), status });
    await expect(fetchPreapproval("preapproval-1", "personal")).rejects.toThrow();
  });
  it.each([
    { status: "canceled", init_point: undefined }, { status: "cancelled", init_point: undefined },
    { status: "canceled", init_point: null }, { status: "cancelled", init_point: null },
  ])("lee cancelación sin URL y conserva transición canónica %j", async (change) => {
    respond({ ...providerPreapproval(), ...change });
    const value = await fetchPreapproval("preapproval-1", "personal");
    expect(value.initPoint).toBeNull();
    expect(value.status).toBe("cancelled");
    expect(SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[value.status]).toBe("CANCELED");
  });
  it.each([undefined, null])("creación pendiente sin URL %s nunca devuelve checkout", async (initPoint) => {
    respond({ ...providerPreapproval(), init_point: initPoint });
    await expect(createSubscriptionCheckout({ subscriptionId, payerEmail: "fixture@example.invalid", planName: "Profesional", amount: 120000, currency: "ARS", accountKey: "personal" })).rejects.toThrow("does not match selection");
  });
  it.each([
    { status: "pending", init_point: undefined }, { status: "pending", init_point: null },
    { status: "authorized", init_point: undefined }, { status: "authorized", init_point: null },
  ])("recuperación sin URL no habilita una redirección %j", async (change) => {
    respond({ results: [{ ...providerPreapproval(), ...change }], paging: { total: 1 } });
    const previous = await findSubscriptionCheckout(subscriptionId, "personal");
    expect(previous).not.toBeNull();
    expect(() => assertCheckoutMatches(previous!, { subscriptionId, amount: 120000, currency: "ARS" }, true)).toThrow("does not match selection");
  });
  it.each(["https://evil.example/checkout", "http://www.mercadopago.com.ar/checkout"])("URL presente insegura también se rechaza en cancelación %s", async (initPoint) => {
    respond({ ...providerPreapproval(), status: "cancelled", init_point: initPoint });
    await expect(fetchPreapproval("preapproval-1", "personal")).rejects.toThrow();
  });
  it("mapa real de consentimiento no activa beneficios antes del pago", () => {
    expect(SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS.authorized).toBeNull();
    expect(SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS.pending).toBeNull();
  });
  it("interruptor cierra checkout sin quitar credenciales a webhooks existentes", async () => {
    env.MERCADOPAGO_CHECKOUT_ENABLED = "false";
    expect(paymentAvailability("personal").configured).toBe(false);
    expect(resolvePaymentAccount("personal")).not.toBeNull();
    respond(providerPayment());
    await expect(fetchPayment("123", "personal")).resolves.toMatchObject({ status: "approved" });
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
  });
  it.each(["ACCESS_TOKEN", "WEBHOOK_SECRET", "COLLECTOR_ID", "ENVIRONMENT"])("cierra configuración incompleta %s", (part) => {
    delete env[`MERCADOPAGO_PERSONAL_${part}`];
    expect(resolvePaymentAccount("personal")).toBeNull();
  });
  it.each([["personal", "101", ["test_user"]], ["company", "202", []]] as const)("verifica dueño y ambiente %s", async (account, id, tags) => {
    respond({ id, tags });
    await expect(verifyPaymentAccountIdentity(account)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.mercadopago.com/users/me");
  });
  it.each([{ id: "999", tags: ["test_user"] }, { id: "101", tags: [] }])("rechaza identidad incompatible", async (owner) => {
    respond(owner);
    await expect(verifyPaymentAccountIdentity("personal")).rejects.toThrow("mismatch");
  });
  it.each([{ collector_id: "202" }, { live_mode: true }, { id: "456" }, { external_reference: "not-a-uuid" }, { date_approved: null }, { transaction_amount: -1 }])("rechaza pago incongruente %j", async (change) => {
    respond({ ...providerPayment(), ...change });
    await expect(fetchPayment("123", "personal")).rejects.toThrow();
  });
  it("devuelve sólo datos mínimos del pago aprobado", async () => {
    respond({ ...providerPayment(), payer: { email: "fixture@example.invalid" } });
    await expect(fetchPayment("123", "personal")).resolves.toEqual({ id: "123", status: "approved", externalReference: subscriptionId, amount: 120000, currency: "ARS", dateApproved: now, createdAt: now, modifiedAt: now });
  });
  it("no expone respuesta del proveedor en errores", async () => {
    respond({ secret: "do-not-log-provider-body" }, 401);
    await expect(fetchPayment("123", "personal")).rejects.toThrow("Mercado Pago request failed");
  });
  it("crea checkout con snapshot del servidor y retorno sin activación", async () => {
    respond(providerPreapproval());
    await createSubscriptionCheckout({ subscriptionId, payerEmail: "fixture@example.invalid", planName: "Profesional", amount: 120000, currency: "ARS", accountKey: "personal" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ external_reference: subscriptionId, status: "pending", back_url: "https://psi.example/dashboard?subscription=checkout-return", auto_recurring: { transaction_amount: 120000, currency_id: "ARS" } });
  });
  it.each([{ auto_recurring: { transaction_amount: 1, currency_id: "ARS", frequency: 1, frequency_type: "months" } }, { external_reference: "20000000-0000-4000-8000-000000000001" }, { init_point: "https://attacker.example/checkout" }, { status: "authorized" }])("no redirige a un checkout incompatible %j", async (change) => {
    respond({ ...providerPreapproval(), ...change });
    await expect(createSubscriptionCheckout({ subscriptionId, payerEmail: "fixture@example.invalid", planName: "Profesional", amount: 120000, currency: "ARS" })).rejects.toThrow();
  });
  it("no elige arbitrariamente entre checkouts duplicados ni búsqueda parcial", async () => {
    respond({ results: [providerPreapproval(), { ...providerPreapproval(), id: "other" }], paging: { total: 2 } });
    await expect(findSubscriptionCheckout(subscriptionId, "personal")).rejects.toThrow("duplicate");
    respond({ results: [providerPreapproval()], paging: { total: 101 } });
    await expect(findSubscriptionCheckout(subscriptionId, "personal")).rejects.toThrow("incomplete");
  });
});

describe("preferencia de pago único (plan aún DRAFT en catálogo)", () => {
  const input = { subscriptionId, payerEmail: "fixture@example.invalid", planName: "Plan ficticio QA", amount: 120000, currency: "ARS", accountKey: "personal" as const };
  const preference = () => ({ id: "preference-1", collector_id: "101", external_reference: subscriptionId, init_point: "https://www.mercadopago.com/mla/checkout?pref_id=preference-1", sandbox_init_point: "https://sandbox.mercadopago.com/mla/checkout?pref_id=preference-1", items: [{ quantity: 1, unit_price: 120000, currency_id: "ARS" }] });
  it("selecciona URL sandbox y notificación de la cuenta verificada", async () => {
    respond(preference());
    await expect(createOneTimeCheckout(input)).resolves.toMatchObject({ providerSubscriptionId: "preference-1", initPoint: preference().sandbox_init_point });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ notification_url: "https://psi.example/api/webhooks/mercado-pago/personal", external_reference: subscriptionId });
  });
  it("no predefine identidad del pagador en la preferencia", async () => {
    respond(preference());
    await createOneTimeCheckout(input);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).not.toHaveProperty("payer");
    expect(body).not.toHaveProperty("payer_email");
    expect(body).not.toHaveProperty("email");
    expect(JSON.stringify(body)).not.toContain(input.payerEmail);
    expect(body.external_reference).toBe(subscriptionId);
  });
  it.each([{ collector_id: "202" }, { external_reference: "20000000-0000-4000-8000-000000000001" }, { items: [{ quantity: 2, unit_price: 120000, currency_id: "ARS" }] }, { items: [{ quantity: 1, unit_price: 1, currency_id: "ARS" }] }, { items: [{ quantity: 1, unit_price: 120000, currency_id: "USD" }] }, { sandbox_init_point: "https://evil.example/checkout" }])("rechaza preferencia cruzada %j", async (change) => {
    respond({ ...preference(), ...change });
    await expect(createOneTimeCheckout(input)).rejects.toThrow();
  });
  it("recupera por búsqueda y verifica recurso sin POST", async () => {
    respond({ total: 1, elements: [{ id: "preference-1" }] });
    respond(preference());
    await expect(findOneTimeCheckout(input)).resolves.toMatchObject({ providerSubscriptionId: "preference-1" });
    expect(fetchMock.mock.calls.map((call) => call[1]?.method)).toEqual(["GET", "GET"]);
  });
  it("recovery con ID conocido no busca ni acepta respuesta de otra preferencia", async () => {
    respond({ ...preference(), id: "different-preference" });
    await expect(findOneTimeCheckout(input, "preference-1")).rejects.toThrow("identity mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("ausente o ambiguo no autoriza creación de otra preferencia", async () => {
    respond({ total: 0, elements: [] });
    await expect(findOneTimeCheckout(input)).resolves.toBeNull();
    respond({ total: 2, elements: [{ id: "preference-1" }] });
    await expect(findOneTimeCheckout(input)).rejects.toThrow("ambiguous");
    expect(fetchMock.mock.calls.every((call) => call[1]?.method === "GET")).toBe(true);
  });
});


describe("factura recurrente autenticada de vendedor de prueba", () => {
  const invoice = () => ({ id: "invoice-1", type: "recurring", preapproval_id: "preapproval-1", external_reference: subscriptionId, transaction_amount: 120000, currency_id: "ARS", payment: { id: "123", status: "approved" } });
  function resources(changes: { invoice?: object; preapproval?: object; payment?: object } = {}, collector = "101") {
    respond({ ...invoice(), ...changes.invoice });
    respond({ ...providerPreapproval(), collector_id: collector, ...changes.preapproval });
    respond({ ...providerPayment(), collector_id: collector, live_mode: true, ...changes.payment });
  }
  it("acepta emails distintos entre preapproval y pago con cadena e importe verificados", async () => {
    respond({ id: "101", tags: ["test_user"] });
    resources({ preapproval: { payer_email: "platform@example.invalid" }, payment: { payer: { email: "mp-buyer@example.invalid" } } });
    const result = await fetchRecurringPayment("invoice-1", "personal");
    expect(result).toMatchObject({ preapproval: { externalReference: subscriptionId }, payment: { externalReference: subscriptionId, status: "approved" } });
    expect(JSON.stringify(result)).not.toContain("@example.invalid");
  });
  it.each([true, false])("acepta live_mode=%s sólo con dueño y cadena verificados", async (liveMode) => {
    respond({ id: "101", tags: ["test_user"] });
    resources({ payment: { live_mode: liveMode } });
    await expect(fetchRecurringPayment("invoice-1", "personal")).resolves.toMatchObject({ preapproval: { id: "preapproval-1" }, payment: { id: "123", status: "approved", dateApproved: now } });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.mercadopago.com/users/me", "https://api.mercadopago.com/authorized_payments/invoice-1",
      "https://api.mercadopago.com/preapproval/preapproval-1", "https://api.mercadopago.com/v1/payments/123",
    ]);
    expect(fetchMock.mock.calls.every(([, options]) => options?.method === "GET" && options.cache === "no-store")).toBe(true);
  });
  it.each([{ id: "101", tags: [] }, { id: "202", tags: ["test_user"] }])("rechaza vendedor real/cruzado antes de leer factura", async (owner) => {
    respond(owner);
    await expect(fetchRecurringPayment("invoice-1", "personal")).rejects.toThrow("identity/environment mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    { invoice: { id: "other" } }, { invoice: { preapproval_id: "other" } }, { invoice: { payment: { id: "other" } } },
    { preapproval: { id: "other" } }, { payment: { id: "other" } },
    { preapproval: { collector_id: "202" } }, { payment: { collector_id: "202" } },
    ...["invoice", "preapproval", "payment"].flatMap((resource) => [
      { [resource]: { external_reference: "20000000-0000-4000-8000-000000000001" } },
      { [resource]: resource === "preapproval" ? { auto_recurring: { transaction_amount: 1, currency_id: "ARS", frequency: 1, frequency_type: "months" } } : { transaction_amount: 1 } },
      { [resource]: resource === "preapproval" ? { auto_recurring: { transaction_amount: 120000, currency_id: "USD", frequency: 1, frequency_type: "months" } } : { currency_id: "USD" } },
    ]),
    { invoice: { type: "other" } }, { invoice: { type: undefined } }, { payment: { date_approved: null } },
  ])("rechaza cadena cruzada o aprobación incompleta %j", async (changes) => {
    respond({ id: "101", tags: ["test_user"] });
    resources(changes);
    await expect(fetchRecurringPayment("invoice-1", "personal")).rejects.toThrow();
  });
  it("factura sin pago no fabrica un cobro ni consulta payments", async () => {
    respond({ id: "101", tags: ["test_user"] });
    respond({ ...invoice(), payment: null });
    await expect(fetchRecurringPayment("invoice-1", "personal")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("el estado del pago consultado prevalece sobre el embebido en factura", async () => {
    respond({ id: "101", tags: ["test_user"] });
    resources({ payment: { status: "rejected", date_approved: null } });
    await expect(fetchRecurringPayment("invoice-1", "personal")).resolves.toMatchObject({ payment: { status: "rejected", dateApproved: null } });
  });
  it("cambiar cuenta activa no cambia la cuenta histórica del recurso", async () => {
    env.MERCADOPAGO_ACTIVE_ACCOUNT = "company";
    respond({ id: "101", tags: ["test_user"] });
    resources();
    await expect(fetchRecurringPayment("invoice-1", "personal")).resolves.toMatchObject({ payment: { id: "123" } });
    expect(fetchMock.mock.calls.every(([, options]) => (options?.headers as Record<string, string>).Authorization === "Bearer test-only-personal")).toBe(true);
  });
  it("producción acepta sólo vendedor real y pago live", async () => {
    respond({ id: "202", tags: [] });
    resources({}, "202");
    await expect(fetchRecurringPayment("invoice-1", "company")).resolves.toMatchObject({ payment: { status: "approved" } });
  });
  it("producción rechaza vendedor test y live_mode false", async () => {
    respond({ id: "202", tags: ["test_user"] });
    await expect(fetchRecurringPayment("invoice-1", "company")).rejects.toThrow("identity/environment mismatch");
    respond({ id: "202", tags: [] });
    resources({ payment: { live_mode: false } }, "202");
    await expect(fetchRecurringPayment("invoice-1", "company")).rejects.toThrow("environment mismatch");
  });
  it("revalida dueño en cada consulta y no conserva un permiso sandbox", async () => {
    respond({ id: "101", tags: ["test_user"] });
    resources();
    await fetchRecurringPayment("invoice-1", "personal");
    respond({ id: "101", tags: [] });
    await expect(fetchRecurringPayment("invoice-1", "personal")).rejects.toThrow("identity/environment mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});


describe("descubrimiento para notificación payment recurrente", () => {
  const input = { paymentId: "123", preapprovalId: "preapproval-1", subscriptionId, account: "personal" as const };
  const row = (id = "invoice-1", paymentId = "123") => ({ id, preapproval_id: input.preapprovalId, external_reference: subscriptionId, payment: { id: paymentId } });
  const page = (results: unknown[], offset = 0, limit = 1, total = results.length) => ({ results, paging: { offset, limit, total } });
  it("descubre sólo referencia tras validar identidad, sin exponer estado o PII", async () => {
    respond({ id: "101", tags: ["test_user"] });
    respond({ ...providerPayment(), live_mode: true, payer: { email: "fixture@example.invalid" } });
    await expect(fetchPaymentSubscriptionReference("123", "personal")).resolves.toBe(subscriptionId);
  });
  it("descubrimiento rechaza vendedor/pago cruzados", async () => {
    respond({ id: "101", tags: [] });
    await expect(fetchPaymentSubscriptionReference("123", "personal")).rejects.toThrow("identity");
    respond({ id: "101", tags: ["test_user"] });
    respond({ ...providerPayment(), collector_id: "202" });
    await expect(fetchPaymentSubscriptionReference("123", "personal")).rejects.toThrow("collector");
  });
  it("busca por preapproval persistido, pagina completo y encuentra ID exacto", async () => {
    respond(page([row("invoice-other", "456")], 0, 1, 2));
    respond(page([row()], 1, 1, 2));
    await expect(findRecurringInvoiceForPayment(input)).resolves.toBe("invoice-1");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.mercadopago.com/authorized_payments/search?preapproval_id=preapproval-1",
      "https://api.mercadopago.com/authorized_payments/search?preapproval_id=preapproval-1&offset=1",
    ]);
  });
  it.each([
    page([]), page([row("invoice-1", "456")]),
    page([row(), row("invoice-2")], 0, 2),
    page([{ ...row(), preapproval_id: "other" }]),
    page([{ ...row(), external_reference: "20000000-0000-4000-8000-000000000001" }]),
    page([row()], 1), page([row()], 0, 2, 3), page([row()], 0, 1, 1001),
  ])("ausencia, ambigüedad, referencia cruzada o paginación inválida falla %j", async (body) => {
    respond(body);
    await expect(findRecurringInvoiceForPayment(input)).rejects.toThrow();
  });
  it("no retorna primer match si una página posterior es ambigua", async () => {
    respond(page([row()], 0, 1, 2));
    respond(page([row("invoice-2")], 1, 1, 2));
    await expect(findRecurringInvoiceForPayment(input)).rejects.toThrow("ambiguous");
  });
  it("rechaza página que repite factura y no avanza", async () => {
    respond(page([row()], 0, 1, 2));
    respond(page([row()], 1, 1, 2));
    await expect(findRecurringInvoiceForPayment(input)).rejects.toThrow("pagination");
  });
  it("no declara unicidad si cambia el total entre páginas", async () => {
    respond(page([row()], 0, 1, 3));
    respond(page([row("invoice-other", "456")], 1, 1, 2));
    await expect(findRecurringInvoiceForPayment(input)).rejects.toThrow("incomplete");
  });
});
