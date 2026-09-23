import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { assertLoopbackHttpUrl, readLocalAuthE2EEnvironment } from "./helpers/local-supabase-fixture";

for (const width of [1440, 390]) {
  test(`cuenta nueva: todos los destinos del menú y cierre de sesión (${width}px)`, async ({ page, baseURL }) => {
    const env = readLocalAuthE2EEnvironment();
    assertLoopbackHttpUrl(baseURL ?? "", "baseURL");
    const backend = createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });
    const email = `e2e.menu.${randomUUID()}@universo-psi.test`;
    const password = `Local-${randomUUID()}!`;
    const { data, error } = await backend.auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull();
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/*", route => {
        const host = new URL(route.request().url()).hostname;
        return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort();
      });
      await page.goto("/ingresar?next=%2Fdashboard");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Contraseña", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(page).toHaveURL(/aceptar-terminos/);
      await page.getByRole("checkbox", { name: /Leí y acepto/ }).check();
      await page.getByRole("button", { name: "Aceptar y continuar" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      const nav = page.getByRole("navigation", { name: "Dashboard", exact: true });
      await expect(nav.getByRole("link", { name: "Inicio", exact: true })).toHaveAttribute("aria-current", "page");
      await nav.getByRole("link", { name: "Consultas", exact: true }).click();
      await expect(page).toHaveURL(/seccion=consultas/);
      await expect(page.getByText("Primero creá tu perfil profesional para poder recibir consultas.")).toBeVisible();
      await expect(nav.getByRole("link", { name: "Consultas", exact: true })).toHaveAttribute("aria-current", "page");
      await page.reload();
      await expect(page.getByRole("heading", { name: "Conversaciones por empezar" })).toBeVisible();
      await nav.getByRole("link", { name: "Suscripción", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Sin plan seleccionado" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Ver planes", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Continuar con el pago" })).toHaveCount(0);
      await page.screenshot({ path: `output/playwright/dashboard-menu-20260913/menu-${width}.png`, fullPage: true });
      await nav.getByRole("link", { name: "Contenido", exact: true }).click();
      await expect(page).toHaveURL(/\/recursos$/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Ideas para pensar");
      await page.goBack();
      await expect(page).toHaveURL(/seccion=suscripcion/);
      await nav.getByRole("link", { name: "Mi perfil", exact: true }).click();
      await expect(page).toHaveURL(/\/profesionales\/sumarse$/);
      await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Volver a mi espacio" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator('[id="contenido"]')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/`);
      await page.goto("/dashboard?seccion=consultas");
      await expect(page).toHaveURL(/\/ingresar\?next=/);
    } finally {
      expect((await backend.auth.admin.deleteUser(data.user!.id)).error).toBeNull();
    }
  });
}
