import { test, expect } from "@playwright/test";
test("solicitud pública, error recuperable y constancia sin cuenta", async ({ page }) => {
  await page.goto("/solicitudes?tipo=CANCELLATION");
  await expect(page.getByLabel("Qué necesitás")).toHaveValue("CANCELLATION");
  await page.getByLabel("Correo de contacto").fill("legal-test@example.com");
  await page.getByLabel("Detalle del pedido").fill("Solicito la baja de mi servicio de prueba.");
  await page.route("**/api/solicitudes", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "No se registró la solicitud." }) }));
  await page.getByRole("button", { name: "Registrar solicitud" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("No se registró");
  await page.unroute("**/api/solicitudes");
  await page.route("**/api/solicitudes", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ reference: "referencia-local-simulada", receivedAt: "2026-09-16T00:00:00Z" }) }));
  await page.getByRole("button", { name: "Registrar solicitud" }).click();
  await expect(page.getByRole("status")).toContainText("referencia-local-simulada");
  await expect(page.getByRole("status")).toContainText("no confirma");
});
test("no inicia medición de navegación y elimina identificadores antiguos", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("universo-psi-anonymous-id", "old-id"); sessionStorage.setItem("universo-psi-session-id", "old-session"); });
  const tracking: string[] = [];
  page.on("request", (request) => { if (/api\/analytics|_vercel\/(insights|speed-insights)/.test(request.url())) tracking.push(request.url()); });
  await page.goto("/profesionales");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("universo-psi-anonymous-id"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("universo-psi-session-id"))).toBeNull();
  expect(tracking).toEqual([]);
});
