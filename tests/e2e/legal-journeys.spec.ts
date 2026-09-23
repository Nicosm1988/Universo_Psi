import { expect, test } from "@playwright/test";

test.describe("consentimiento de cookies", () => {
  // Estos recorridos necesitan la primera visita, sin decisión guardada.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("la primera visita ofrece aceptar, configurar o rechazar", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByRole("region", { name: "Consentimiento de cookies" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: "Aceptar todas" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Configurar" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Rechazar" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  test("ninguna categoría opcional viene preactivada", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Consentimiento de cookies" })
      .getByRole("button", { name: "Configurar" })
      .click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    const necessary = panel.getByRole("checkbox", { name: /Cookies técnicas y necesarias/ });
    await expect(necessary).toBeChecked();
    await expect(necessary).toBeDisabled();

    for (const label of [
      /Cookies de personalización y preferencias/,
      /Cookies de análisis y estadística/,
      /Cookies de funcionalidades externas/,
    ]) {
      await expect(panel.getByRole("checkbox", { name: label })).not.toBeChecked();
    }
  });

  test("rechazar cierra el banner y deja la medición apagada", async ({ page }) => {
    const analyticsCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/analytics")) analyticsCalls.push(request.url());
    });

    await page.goto("/");
    await page.getByRole("region", { name: "Consentimiento de cookies" })
      .getByRole("button", { name: "Rechazar" })
      .click();
    await expect(page.getByRole("region", { name: "Consentimiento de cookies" })).toHaveCount(0);

    await page.goto("/profesionales");
    await page.waitForLoadState("networkidle");
    expect(analyticsCalls).toEqual([]);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("universo-psi-cookie-consent:v1"),
    );
    expect(stored).toContain('"analytics":false');
  });

  test("la decisión sobrevive a la navegación y se puede volver a abrir", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Consentimiento de cookies" })
      .getByRole("button", { name: "Aceptar todas" })
      .click();

    await page.goto("/privacidad");
    await expect(page.getByRole("region", { name: "Consentimiento de cookies" })).toHaveCount(0);

    await page.getByRole("button", { name: "Configurar cookies" }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("checkbox", { name: /Cookies de análisis y estadística/ })).toBeChecked();

    await panel.getByRole("checkbox", { name: /Cookies de análisis y estadística/ }).uncheck();
    await panel.getByRole("button", { name: "Guardar preferencias" }).click();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("universo-psi-cookie-consent:v1"),
    );
    expect(stored).toContain('"analytics":false');
    expect(stored).toContain('"preferences":true');
  });
});

test("las preguntas frecuentes responden por secciones y enlazan a contacto", async ({ page }) => {
  await page.goto("/preguntas-frecuentes");

  await expect(page.getByRole("heading", { level: 1, name: "Preguntas frecuentes" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Para profesionales de la salud mental y similares" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Para usuarios y visitantes" })).toBeVisible();

  const question = page.locator("details").filter({ hasText: "¿Cómo me registro" }).first();
  await expect(question).not.toHaveAttribute("open", "");
  await question.locator("summary").click();
  await expect(question).toHaveAttribute("open", "");
  await expect(question).toContainText("universopsi.com.ar");

  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("contacto registra un pedido de derechos sobre datos", async ({ page }) => {
  await page.goto("/contacto?motivo=PRIVACIDAD");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Escribinos");
  await expect(page.getByRole("combobox", { name: "Motivo" })).toHaveValue("PRIVACIDAD");

  await page.getByRole("textbox", { name: "Nombre y apellido" }).fill("Alex Prueba");
  await page.getByRole("textbox", { name: "Email" }).fill("alex@example.com");
  await page
    .getByRole("textbox", { name: "Mensaje" })
    .fill("Quiero acceder a los datos personales que tienen registrados sobre mí.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByRole("status")).toContainText("Recibimos tu mensaje");
});

test("la política de privacidad publica el canal de contacto y el órgano de control", async ({ page }) => {
  await page.goto("/privacidad");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Política de privacidad y tratamiento de datos personales",
  );
  await expect(page.getByRole("link", { name: "hola@universosenda.com" })).toHaveAttribute(
    "href",
    "mailto:hola@universosenda.com",
  );
  await expect(page.getByRole("link", { name: "www.argentina.gob.ar/aaip" }).first()).toHaveAttribute(
    "href",
    "https://www.argentina.gob.ar/aaip",
  );
});

test("los términos publican la cláusula 10 que la privacidad referencia", async ({ page }) => {
  await page.goto("/terminos");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Términos y condiciones de uso");
  await expect(page.getByText("Borrador sujeto a revisión legal")).toHaveCount(0);

  const clause = page.locator("#seguridad-informatica");
  await expect(clause).toContainText("10. Seguridad informática y exención de responsabilidad técnica");

  await page.goto("/privacidad");
  await expect(
    page.getByRole("link", { name: "Cláusula 10 de los Términos y Condiciones" }),
  ).toHaveAttribute("href", "/terminos#seguridad-informatica");
});
