import { expect, test, type Locator } from "@playwright/test";

async function expectIndependentVerticalScroll(container: Locator) {
  await expect(container).toBeVisible();

  const scrollState = await container.evaluate(async (element) => {
    const documentScrollBefore = window.scrollY;
    const maximumScroll = element.scrollHeight - element.clientHeight;

    element.scrollTop = 0;
    element.scrollTop = Math.min(160, maximumScroll);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    return {
      documentScrollAfter: window.scrollY,
      documentScrollBefore,
      maximumScroll,
      overflowY: getComputedStyle(element).overflowY,
      scrollTop: element.scrollTop,
    };
  });

  expect(scrollState.maximumScroll).toBeGreaterThan(0);
  expect(scrollState.overflowY).toBe("auto");
  expect(scrollState.scrollTop).toBeGreaterThan(0);
  expect(scrollState.documentScrollAfter).toBe(scrollState.documentScrollBefore);
}

test("home is search-first, compact, and free of photos or questionnaires", async ({ page }) => {
  await page.goto("/");

  const search = page.getByRole("search");
  await expect(search).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar para contactar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear cuenta gratuita" })).toBeVisible();
  await expect(page.locator("main img, main picture")).toHaveCount(0);
  await expect(page.locator('a[href="/matching"]')).toHaveCount(0);
  await expect(page.getByText(/No sé qué ayuda necesito/i)).toHaveCount(0);

  const searchBox = await search.boundingBox();
  const searchButtonBox = await search.getByRole("button", { name: "Buscar profesionales" }).boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 900;
  expect(searchBox).not.toBeNull();
  expect(searchButtonBox).not.toBeNull();
  expect(searchBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((searchBox?.y ?? Number.POSITIVE_INFINITY) + (searchBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight);
  expect((searchButtonBox?.y ?? Number.POSITIVE_INFINITY) + (searchButtonBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight);

  const viewportWidth = page.viewportSize()?.width ?? 1440;
  const searchHeroBox = await page.getByTestId("home-search-hero").boundingBox();
  expect(searchHeroBox).not.toBeNull();
  if (viewportWidth >= 1024) {
    expect(searchHeroBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(560);
  }

  const mainHeight = await page.locator("main").evaluate((element) => element.scrollHeight);
  expect(mainHeight).toBeLessThanOrEqual(viewportHeight * (viewportWidth < 768 ? 2.15 : 1.6));

  const networkShowcase = page.locator('[aria-roledescription="carrusel"]');
  await expect(networkShowcase).toBeVisible();
  await expect(page.getByText("Qué es Universo Psi")).toBeVisible();
  await expect(networkShowcase.getByText(/Opinión (?:demo|moderada)/)).toBeVisible();
  await expect(networkShowcase.locator("img, picture")).toHaveCount(0);

  const activeProfessionalName = networkShowcase
    .getByTestId("home-professional-slide")
    .getByRole("heading", { level: 4 });
  const firstProfessionalName = await activeProfessionalName.innerText();
  await networkShowcase.getByRole("button", { name: "Pausar rotación automática" }).click();
  await networkShowcase.getByRole("button", { name: "Ver siguiente profesional" }).click();
  await expect(activeProfessionalName).not.toHaveText(firstProfessionalName);

  await search.getByRole("searchbox").fill("orientación");
  await search.locator('select[name="type"]').selectOption("psicopedagogia");
  await search.locator('select[name="modality"]').selectOption("online");
  await search.getByRole("button", { name: "Buscar profesionales" }).click();

  await expect(page).toHaveURL(/q=orientaci%C3%B3n/);
  await expect(page).toHaveURL(/type=psicopedagogia/);
  await expect(page).toHaveURL(/modality=online/);
});

test("home keeps the professional search immediately usable at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const heroBox = await page.getByTestId("home-search-hero").boundingBox();
  const searchButtonBox = await page
    .getByRole("search")
    .getByRole("button", { name: "Buscar profesionales" })
    .boundingBox();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(heroBox).not.toBeNull();
  expect(searchButtonBox).not.toBeNull();
  expect(heroBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(600);
  expect(searchButtonBox?.y ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(0);
  expect((searchButtonBox?.y ?? 0) + (searchButtonBox?.height ?? 0)).toBeLessThanOrEqual(568);
  expect(horizontalOverflow).toBe(0);
});

test("home → filtered search → profile → contact", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Encontrá tu profesional.",
    }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Cambiar de trabajo" })
    .click();

  await expect(page).toHaveURL(/\/profesionales\?need=cambio-trabajo/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Encontrá a tu profesional orientador/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/profesional(?:es)? coincide/i).first(),
  ).toBeVisible();

  const firstResult = page.locator("article").filter({
    has: page.getByRole("link", { name: "Contactar" }),
  }).first();
  const professionalName = (await firstResult.getByRole("heading").innerText()).trim();
  await firstResult.getByRole("link", { name: "Ver perfil" }).click();

  await expect(page).toHaveURL(/\/profesionales\/[a-z0-9-]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: professionalName }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Contactar ahora" }).first().click();
  await expect(page).toHaveURL(/#contactar$/);
  await expect(
    page.locator("#contactar").getByRole("heading", { name: new RegExp(`Contactá a ${professionalName.split(" ")[0]}`, "i") }),
  ).toBeVisible();

  await page.getByLabel("Nombre").fill("Julia Díaz");
  await page.getByLabel("Email", { exact: true }).fill("julia@example.com");
  await page.getByLabel("Motivo principal").selectOption({ index: 1 });
  await page.getByLabel("¿Cómo preferís que te respondan?").selectOption("WHATSAPP");
  await page.getByLabel("Teléfono").fill("11 5555 1234");
  await page
    .getByLabel("¿Qué te gustaría conversar?")
    .fill(
      "Estoy pensando un cambio de trabajo y necesito ordenar alternativas concretas.",
    );
  await page.getByRole("checkbox", { name: /Acepto que Universo Psi/i }).check();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/leads",
  );
  await page
    .getByRole("button", { name: new RegExp(`Enviar consulta a ${professionalName.split(" ")[0]}`, "i") })
    .click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  await expect(page.getByRole("status")).toContainText(
    "Tu consulta fue enviada",
  );
  await expect(page.getByRole("status")).toContainText(professionalName);
});

test("directory filters apply immediately and stay synchronized with the URL", async ({ page }) => {
  await page.goto("/profesionales");

  const mobileFilterPanel = page.locator("details.filter-panel");
  const useMobileFilters = await mobileFilterPanel.isVisible();
  const revealMobileFilters = async () => {
    if (!useMobileFilters) return;
    const isOpen = await mobileFilterPanel.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) await mobileFilterPanel.locator("summary").click();
  };

  await revealMobileFilters();
  const filterForm = page.getByTestId(
    useMobileFilters ? "professional-filters-mobile" : "professional-filters-desktop",
  );
  const professionalType = filterForm.locator('select[name="type"]');
  const jobChange = filterForm.getByRole("checkbox", {
    name: "Cambiar o encontrar trabajo",
  });

  await expect(professionalType).toHaveValue("");
  await expect(professionalType.locator("option")).toHaveText([
    "Profesional orientador",
    "Psicólogo/a",
    "Psicopedagogo/a",
  ]);

  await professionalType.selectOption("psicologia");
  await expect(page).toHaveURL(/type=psicologia/);
  await expect(professionalType).toHaveValue("psicologia");

  await revealMobileFilters();
  await jobChange.check();
  await expect(page).toHaveURL(/need=cambio-trabajo/);
  await revealMobileFilters();
  await expect(jobChange).toBeChecked();

  const resultCards = page.getByTestId("professional-card").filter({
    has: page.getByRole("link", { name: "Contactar" }),
  });
  expect(await resultCards.count()).toBeGreaterThan(0);
  for (const card of await resultCards.all()) {
    await expect(card.getByText(/Psicólog[oa]/i)).toBeVisible();
  }

  await revealMobileFilters();
  await filterForm.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/profesionales$/);
  await revealMobileFilters();
  await expect(jobChange).not.toBeChecked();

  await page.goBack();
  await expect(page).toHaveURL(/type=psicologia/);
  await expect(page).toHaveURL(/need=cambio-trabajo/);
  await revealMobileFilters();
  await expect(professionalType).toHaveValue("psicologia");
  await expect(jobChange).toBeChecked();
});

test("directory uses compact aligned rows and the filter rail scrolls independently", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.goto("/profesionales");

  const cards = page.getByTestId("professional-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  await expect(cards.first()).toBeVisible();

  const directoryLayout = page
    .getByTestId("professional-results")
    .locator("..")
    .locator("..");
  const directoryLayoutBox = await directoryLayout.boundingBox();
  expect(directoryLayoutBox).not.toBeNull();
  expect(directoryLayoutBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(60);
  expect(directoryLayoutBox?.width ?? 0).toBeGreaterThanOrEqual(1300);

  const layout = await cards.evaluateAll((elements) => {
    return elements.slice(0, 2).map((card) => {
      const cardRect = card.getBoundingClientRect();
      const actions = card.querySelectorAll('[data-card-section="actions"]');
      const actionsRect = actions.item(0)?.getBoundingClientRect();
      const facts = card.querySelectorAll('[data-card-section="facts"]');
      const factColumns = card.querySelectorAll('[data-card-section="facts"] > div');

      return {
        actions: {
          count: actions.length,
          left: actionsRect?.left ?? null,
          width: actionsRect?.width ?? null,
        },
        card: {
          bottom: cardRect.bottom,
          height: cardRect.height,
          left: cardRect.left,
          top: cardRect.top,
          width: cardRect.width,
        },
        factsCount: facts.length,
        factColumns: Array.from(factColumns, (column) => {
          const rect = column.getBoundingClientRect();

          return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
          };
        }),
      };
    });
  });

  const [firstCardLayout, secondCardLayout] = layout;
  if (!firstCardLayout || !secondCardLayout) throw new Error("Se necesitan 2 tarjetas para verificar la alineación.");

  expect(secondCardLayout.card.top).toBeGreaterThanOrEqual(firstCardLayout.card.bottom);
  expect(Math.abs(firstCardLayout.card.left - secondCardLayout.card.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(firstCardLayout.card.width - secondCardLayout.card.width)).toBeLessThanOrEqual(1);
  expect(firstCardLayout.card.height).toBeLessThanOrEqual(245);
  expect(secondCardLayout.card.height).toBeLessThanOrEqual(245);

  expect(firstCardLayout.actions.count).toBe(1);
  expect(secondCardLayout.actions.count).toBe(1);
  expect(firstCardLayout.actions.left).not.toBeNull();
  expect(secondCardLayout.actions.left).not.toBeNull();
  expect(firstCardLayout.actions.width).not.toBeNull();
  expect(secondCardLayout.actions.width).not.toBeNull();
  expect(Math.abs((firstCardLayout.actions.left ?? 0) - (secondCardLayout.actions.left ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((firstCardLayout.actions.width ?? 0) - (secondCardLayout.actions.width ?? 0))).toBeLessThanOrEqual(1);

  for (const cardLayout of [firstCardLayout, secondCardLayout]) {
    expect(cardLayout.factsCount).toBe(1);
    expect(cardLayout.factColumns).toHaveLength(2);

    const factColumnWidths = cardLayout.factColumns.map((column) => column.width);
    const factColumnTops = cardLayout.factColumns.map((column) => column.top);
    expect(Math.max(...factColumnWidths) - Math.min(...factColumnWidths)).toBeLessThanOrEqual(1);
    expect(Math.max(...factColumnTops) - Math.min(...factColumnTops)).toBeLessThanOrEqual(1);
    expect(cardLayout.factColumns[1]?.left ?? 0).toBeGreaterThan(cardLayout.factColumns[0]?.left ?? Number.POSITIVE_INFINITY);
  }

  const filterRail = page.getByTestId("professional-filters-desktop-scroll");
  await expectIndependentVerticalScroll(filterRail);

  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("/profesionales");

  const mobileFilterPanel = page.locator("details.filter-panel");
  const mobileFilterRail = page.getByTestId("professional-filters-mobile-scroll");
  const firstMobileResult = page.getByTestId("professional-card").first();

  await expect(mobileFilterPanel).toBeVisible();
  expect(await mobileFilterPanel.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(mobileFilterRail).toBeHidden();
  await expect(firstMobileResult).toBeVisible();

  const firstMobileResultBox = await firstMobileResult.boundingBox();
  expect(firstMobileResultBox).not.toBeNull();
  expect(firstMobileResultBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(550);

  await mobileFilterPanel.locator("summary").click();
  expect(await mobileFilterPanel.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true);
  await expectIndependentVerticalScroll(mobileFilterRail);

  const horizontalOverflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(horizontalOverflow.scrollWidth).toBeLessThanOrEqual(horizontalOverflow.clientWidth + 1);

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/profesionales");
  const narrowOverflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(narrowOverflow.scrollWidth).toBeLessThanOrEqual(narrowOverflow.clientWidth + 1);
});

test("every professional card communicates its verification state", async ({ page }) => {
  await page.goto("/profesionales");

  const cards = page.getByTestId("professional-card");
  expect(await cards.count()).toBeGreaterThan(0);

  for (const card of await cards.all()) {
    await expect(card.getByText(/^(?:✓ Verificado|Verificación en curso)$/)).toHaveCount(1);
  }

  const pendingCard = cards.filter({ hasText: "Verificación en curso" });
  expect(await pendingCard.count()).toBeGreaterThan(0);
  await expect(pendingCard.first().getByText("Verificación en curso", { exact: true })).toBeVisible();
});

test("the end of a professional profile repeats the contact action", async ({ page }) => {
  await page.goto("/profesionales/valentina-acosta");

  const finalCallToAction = page.getByTestId("profile-final-cta");
  await finalCallToAction.scrollIntoViewIfNeeded();
  await expect(finalCallToAction).toBeVisible();

  const contact = finalCallToAction.getByRole("link", { name: "Contactar a Valentina" });
  await expect(contact).toHaveAttribute("href", "#contactar");
  await contact.click();
  await expect(page).toHaveURL(/#contactar$/);
  await expect(page.locator("#contactar form")).toBeVisible();
});

test("directory and profile hide prices and experience years while keeping ratings and opinions", async ({ page }) => {
  await page.goto("/profesionales");

  const forbiddenPublicPrice = /\b(?:ARS|USD)\b|\$\s*\d|valor\s+orientativo|honorarios?|precio\s+(?:desde|por|de\s+la\s+consulta)/i;
  const forbiddenExperienceYears = /\b\d+\s+años?\b|\b(?:19|20)\d{2}\s*(?:—|-)\s*(?:actualidad|(?:19|20)\d{2})\b/i;
  expect(await page.locator("main").innerText()).not.toMatch(forbiddenPublicPrice);
  expect(await page.locator("main").innerText()).not.toMatch(forbiddenExperienceYears);

  const firstCard = page.getByTestId("professional-card").first();
  await expect(firstCard.locator('[data-card-section="actions"]')).toContainText(
    /\d+[,.]\d\s*·\s*\d+\s+(?:opinión|opiniones)/i,
  );
  await firstCard.getByRole("link", { name: "Ver perfil" }).click();

  expect(await page.locator("main").innerText()).not.toMatch(forbiddenPublicPrice);
  expect(await page.locator("main").innerText()).not.toMatch(forbiddenExperienceYears);
  await expect(page.locator("main")).toContainText(
    /\d+[,.]\d\s*·\s*\d+\s+(?:opinión|opiniones)/i,
  );
  await expect(page.getByRole("heading", { name: "Opiniones" })).toBeVisible();
  const publishedOpinion = page.locator('section[aria-labelledby="opiniones"] blockquote').first();
  await expect(publishedOpinion).toBeVisible();
  await expect(publishedOpinion).toContainText(/\S/);
  await expect(page.getByRole("link", { name: "Contactar ahora" }).first()).toBeVisible();
  expect(await page.content()).not.toMatch(/priceCurrency|starting_price|show_starting_price|price_from/i);
});

test("theme choice persists across public pages", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.evaluate(() =>
    window.localStorage.removeItem("universo-psi-theme:v1"),
  );
  await page.reload();

  const root = page.locator("html");
  const activateLight = page.getByRole("button", {
    name: "Activar modo claro",
  });

  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(activateLight).toHaveAttribute("aria-pressed", "true");
  await activateLight.click();
  await expect(root).toHaveAttribute("data-theme", "light");

  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("universo-psi-theme:v1"),
    ),
  ).toBe("light");

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");

  await page.goto("/terminos");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Activar modo claro" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { level: 1, name: "Términos y condiciones" }),
  ).toBeVisible();
});

test("legacy matching route leads directly to the professional search", async ({ page }) => {
  await page.goto("/matching");
  await expect(page).toHaveURL(/\/profesionales$/);
  await expect(page.getByRole("heading", { level: 1, name: /Encontrá a tu profesional orientador/i })).toBeVisible();
});
