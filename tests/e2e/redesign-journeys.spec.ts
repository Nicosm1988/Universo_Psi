import { expect, test } from "@playwright/test";

test("volver desde un perfil conserva filtros y el resultado después de recargar", async ({ page }) => {
  await page.goto("/profesionales?need=ansiedad&type=psicologia");
  await expect(page.getByLabel("Filtros aplicados")).toContainText("Ansiedad");
  await expect(page.getByLabel("Filtros aplicados")).toContainText("Psicólogo/a");
  const card = page.getByTestId("professional-card").first();
  const id = await card.getAttribute("id");
  const name = await card.getByRole("heading").innerText();
  await card.getByRole("link", { name: "Ver perfil", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await page.reload();
  await page.getByRole("link", { name: "Volver al buscador", exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`need=ansiedad&type=psicologia#${id}$`));
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("menú móvil: Escape devuelve el foco y navegar cierra el menú", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profesionales");
  const menu = page.locator("details.mobile-nav");
  const trigger = menu.locator("summary");
  await trigger.click();
  const navigation = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(navigation.getByRole("link", { name: "Buscar profesional", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(menu).not.toHaveAttribute("open", "");
  await trigger.click();
  await navigation.getByRole("link", { name: "Soy profesional" }).click();
  await expect(page).toHaveURL(/\/para-profesionales$/);
  await expect(menu).not.toHaveAttribute("open", "");
  await trigger.click();
  await expect(navigation.getByRole("link", { name: "Soy profesional" })).toHaveAttribute("aria-current", "page");
});

test("contacto: fallo de red conserva datos y reintento confirma consulta, no turno", async ({ page }) => {
  let attempts = 0;
  const keys: string[] = [];
  await page.route("**/api/leads", async (route) => {
    attempts += 1;
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    if (attempts === 1) return route.abort("failed");
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/profesionales?need=ansiedad");
  await page.getByTestId("professional-card").first().getByRole("link", { name: "Contactar", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Persona de prueba");
  await page.getByLabel("Email", { exact: true }).fill("prueba@example.com");
  await page.getByLabel("Motivo principal").selectOption({ index: 1 });
  const message = "Quisiera consultar horarios para una primera entrevista.";
  await page.getByLabel("¿Qué te gustaría conversar?").fill(message);
  await page.getByRole("checkbox", { name: /Acepto que Universo Psi/ }).check();
  await page.getByRole("button", { name: /Enviar consulta a/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Revisá tu conexión" })).toBeVisible();
  await expect(page.getByLabel("¿Qué te gustaría conversar?")).toHaveValue(message);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("prueba@example.com");
  await page.getByRole("button", { name: /Enviar consulta a/ }).click();
  await expect(page.getByRole("status")).toContainText("Todavía no hay un turno confirmado");
  expect(attempts).toBe(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
});

for (const width of [320, 390, 768, 1440]) {
  test(`recorridos públicos sin desborde a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/profesionales", "/para-profesionales", "/planes", "/ingresar"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
