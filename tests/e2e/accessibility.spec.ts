import { expect, test, type Page } from "@playwright/test";

const publicPages = [
  "/",
  "/profesionales",
  "/profesionales/valentina-acosta",
  "/terminos",
] as const;

const responsiveViewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const;

async function expectNamedInteractiveElements(page: Page) {
  const interactive = page.locator(
    'a[href]:visible, button:visible, input:not([tabindex="-1"]):visible, select:visible, textarea:visible, summary:visible',
  );
  const count = await interactive.count();

  for (let index = 0; index < count; index += 1) {
    await expect(interactive.nth(index)).toHaveAccessibleName(/\S/);
  }
}

for (const path of publicPages) {
  test(`${path} exposes basic accessible structure`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("main#contenido")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const menu = page.getByText("Menú", { exact: true });
    if (await menu.isVisible()) await menu.click();
    await expect(
      page.getByRole("navigation", { name: /Navegación/ }).first(),
    ).toBeVisible();

    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skipLink).toHaveAttribute("href", "#contenido");
    await skipLink.focus();
    await expect(skipLink).toBeVisible();

    const images = page.locator("img");
    for (let index = 0; index < (await images.count()); index += 1) {
      await expect(images.nth(index)).toHaveAttribute("alt");
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNamedInteractiveElements(page);
  });
}

test("contact controls have programmatic labels and keyboard focus", async ({
  page,
}) => {
  await page.goto("/profesionales/valentina-acosta#contactar");

  const form = page.locator("#contactar form");
  await expect(form).toBeVisible();

  for (const control of [
    form.locator('input[name="name"]'),
    form.locator('input[name="email"]'),
    form.locator('select[name="needId"]'),
    form.locator('select[name="contactPreference"]'),
    form.locator('input[name="phone"]'),
    form.locator('textarea[name="message"]'),
    form.locator('input[name="consent"]'),
  ]) {
    await expect(control).toHaveAccessibleName(/\S/);
    await control.focus();
    await expect(control).toBeFocused();
  }

  await expect(form.locator('input[name="name"]')).toHaveAttribute(
    "autocomplete",
    "name",
  );
  await expect(form.locator('input[name="email"]')).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(form.locator('input[name="phone"]')).toHaveAttribute(
    "autocomplete",
    "tel",
  );
});

for (const viewport of responsiveViewports) {
  test(`directory and profile avoid horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const path of ["/profesionales", "/profesionales/valentina-acosta"] as const) {
      await page.goto(path);
      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        mainWidth: document.querySelector("main")?.getBoundingClientRect().width ?? Number.POSITIVE_INFINITY,
      }));

      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.mainWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }
  });
}
