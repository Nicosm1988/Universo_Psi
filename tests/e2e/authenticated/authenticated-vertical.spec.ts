import { expect, test, type Page } from "@playwright/test";

import {
  AUTH_E2E,
  createAuthE2EFixture,
  type AuthE2EFixture,
} from "./helpers/local-supabase-fixture";

let fixture: AuthE2EFixture;

async function login(page: Page, email: string, next: string) {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(AUTH_E2E.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test.describe("vertical autenticado profesional y administración", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    fixture = await createAuthE2EFixture();
  });

  test.afterAll(async () => {
    await fixture?.cleanup();
  });

  test("el profesional acepta términos, completa onboarding, elige plan y presenta credencial", async ({
    page,
  }) => {
    await login(
      page,
      AUTH_E2E.professionalEmail,
      "/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY",
    );

    await expect(page).toHaveURL(/\/aceptar-terminos\?next=/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Acordemos cómo cuidamos tus datos.",
      }),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: /Leí y acepto los términos/i })
      .check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();

    await expect(page).toHaveURL(
      /\/profesionales\/sumarse\?plan=PROFESSIONAL_MONTHLY$/,
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Tu recorrido merece una presentación a la altura/i,
      }),
    ).toBeVisible();

    await page.getByLabel("Nombre", { exact: true }).fill(
      AUTH_E2E.professionalFirstName,
    );
    await page.getByLabel("Apellido", { exact: true }).fill(
      AUTH_E2E.professionalLastName,
    );
    const professionalType = page.getByLabel("Profesional orientador");
    await expect(professionalType.locator("option:not([disabled])")).toHaveText([
      "Psicólogo/a",
      "Psicopedagogo/a",
    ]);
    await professionalType.selectOption({ label: "Psicopedagogo/a" });
    await page.getByLabel("Años de experiencia").fill("7");
    await page
      .getByLabel("Disponibilidad")
      .selectOption({ label: "Disponible" });
    await page
      .getByRole("button", { name: "Elegir especialidades" })
      .click();

    await page
      .getByRole("group", { name: "¿En qué necesidades acompañás?" })
      .getByLabel(/Quiero cambiar de trabajo/i)
      .check();
    await page
      .getByRole("group", { name: "¿Qué servicios ofrecés?" })
      .getByLabel(/Estrategia de carrera/i)
      .check();
    await page
      .getByRole("group", { name: "Modalidades" })
      .getByLabel("Online", { exact: true })
      .check();
    await page
      .getByRole("group", { name: "Idiomas de atención" })
      .getByLabel("Español", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Completar presentación" })
      .click();

    await page
      .getByLabel("Titular del perfil")
      .fill("Psicopedagogía para decisiones educativas con propósito");
    await page
      .getByLabel("Sobre vos")
      .fill(
        "Perfil ficticio creado únicamente para validar el recorrido autenticado local de Universo Psi.",
      );
    await page
      .getByLabel("Cómo trabajás")
      .fill("Ordenamos objetivos, alternativas y próximos pasos verificables.");
    await page
      .getByLabel("Experiencia relevante")
      .fill("Experiencia ficticia exclusiva de la prueba automatizada.");
    await page
      .getByLabel("Formación")
      .fill("Formación ficticia exclusiva de la prueba automatizada.");
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Borrador guardado",
    );
    await page
      .getByRole("button", { name: "Continuar a documentos" })
      .click();

    await page
      .getByLabel("Tipo de documento")
      .selectOption({ label: "Título universitario" });
    await page.getByLabel("Título", { exact: true }).fill(AUTH_E2E.credentialTitle);
    await page
      .getByLabel("Institución emisora (opcional)")
      .fill("Institución ficticia E2E");
    await page.getByLabel("Fecha de emisión (opcional)").fill("2026-01-15");
    await page.getByLabel("Archivo").setInputFiles({
      name: "credencial-e2e.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n% Universo Psi authenticated browser fixture\n%%EOF\n",
      ),
    });
    await page.getByRole("button", { name: "Cargar documento" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Documento recibido y pendiente de revisión." }),
    ).toBeVisible();
    await expect(page.getByText(AUTH_E2E.credentialTitle)).toBeVisible();
    await expect(page.getByText("En revisión", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Revisar perfil" }).click();
    await expect(
      page.getByRole("radio", { name: /Impulso/i }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Enviar a revisión" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Perfil enviado" }),
    ).toBeVisible();

    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      planCode: "PROFESSIONAL_MONTHLY",
      publicationStatus: "PENDING_REVIEW",
      slug: fixture.expectedProfileSlug,
      subscriptionStatus: "PENDING_PAYMENT",
      verificationState: "PENDING",
    });
  });

  test("el SUPERADMIN aprueba la credencial y publica el perfil desde la UI", async ({
    page,
  }) => {
    await login(page, AUTH_E2E.adminEmail, "/admin");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Panel de revisión" }),
    ).toBeVisible();

    const credentialSection = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: "Credenciales" }),
    });
    const credentialItem = credentialSection
      .locator("li")
      .filter({ hasText: AUTH_E2E.professionalFullName });
    await expect(credentialItem).toContainText(AUTH_E2E.credentialTitle);
    await credentialItem
      .getByLabel(/Notas internas \/ motivo si se rechaza/i)
      .fill("Credencial ficticia aprobada por el flujo E2E local.");
    await credentialItem.getByRole("button", { name: "Aprobar" }).click();

    await expect(page).toHaveURL(/\/admin\?notice=credential-resolved$/);
    await expect(page.getByRole("status")).toContainText(
      "Decisión registrada y auditada.",
    );
    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      publicationStatus: "PENDING_REVIEW",
      verificationState: "VERIFIED",
    });

    const profilesSection = page.locator("section").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: "Perfiles para publicar",
      }),
    });
    const profileItem = profilesSection
      .locator("li")
      .filter({ hasText: AUTH_E2E.professionalFullName });
    await expect(profileItem.getByText("VERIFIED", { exact: true })).toBeVisible();
    await profileItem.getByRole("button", { name: "Publicar" }).click();

    await expect(page).toHaveURL(/\/admin\?notice=publication-resolved$/);
    await expect(page.getByRole("status")).toContainText(
      "Decisión registrada y auditada.",
    );
    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      publicationStatus: "PUBLISHED",
      verificationState: "VERIFIED",
    });

    await page.goto(`/profesionales/${fixture.expectedProfileSlug}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: AUTH_E2E.professionalFullName,
      }),
    ).toBeVisible();
  });

  test("el profesional ve publicación y plan Impulso en su dashboard", async ({
    page,
  }) => {
    await login(page, AUTH_E2E.professionalEmail, "/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Hola, ${AUTH_E2E.professionalFirstName}.`,
      }),
    ).toBeVisible();
    await expect(page.getByText("Publicado", { exact: true })).toBeVisible();

    const subscription = page.locator("#suscripcion");
    await expect(
      subscription.getByRole("heading", { level: 2, name: "Impulso" }),
    ).toBeVisible();
    await expect(subscription).toContainText(
      "No se activará ningún cobro hasta completar la integración segura.",
    );

    await page.getByRole("link", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/profesionales\/sumarse$/);
    await page.getByRole("button", { name: "Elegir especialidades" }).click();
    await page
      .getByRole("button", { name: "Completar presentación" })
      .click();
    await page
      .getByLabel("Titular del perfil")
      .fill("Psicopedagogía — contenido actualizado por E2E");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByRole("status")).toContainText("Borrador guardado");
    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      publicationStatus: "PENDING_REVIEW",
    });
  });
});
