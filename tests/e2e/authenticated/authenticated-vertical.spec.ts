import { totp } from "../../helpers/totp";
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
    const professionalType = page.getByLabel("Tipo de profesional");
    await expect(professionalType.locator("option:not([disabled])")).toHaveText([
      "Psicólogo/a",
      "Psicopedagogo/a",
      "Psiquiatra",
      "Musicoterapeuta",
      "Terapista ocupacional",
      "Fonoaudiólogo/a",
      "Terapeuta familiar sistémico/a",
      "Arteterapeuta",
      "Acompañante terapéutico en adicciones",
      "Especialista en educación especial",
      "Trabajador/a social",
      "Psicomotricista",
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
      .getByLabel(/^Dificultades de aprendizaje/i)
      .check();
    await page
      .getByRole("group", { name: "¿Qué servicios ofrecés?" })
      .getByLabel(/^Terapia individual/i)
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
    await page.getByRole("button", { name: "Guardar y continuar" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Borrador guardado",
    );

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

    // psicopedagogo/a is a regulated type requiring BOTH a university degree
    // and a professional license (public.verification_rules) — publish
    // stays blocked in the admin test below until both are approved.
    await page
      .getByLabel("Tipo de documento")
      .selectOption({ label: "Matrícula profesional" });
    await page.getByLabel("Título", { exact: true }).fill(
      AUTH_E2E.licenseCredentialTitle,
    );
    await page
      .getByLabel("Jurisdicción (si corresponde)")
      .fill("CABA");
    await page
      .getByLabel("Matrícula o registro (si corresponde)")
      .fill("M.P. 12345");
    await page.getByLabel("Archivo").setInputFiles({
      name: "matricula-e2e.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n% Universo Psi authenticated browser fixture (license)\n%%EOF\n",
      ),
    });
    await page.getByRole("button", { name: "Cargar documento" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Documento recibido y pendiente de revisión." }),
    ).toBeVisible();
    await expect(page.getByText(AUTH_E2E.licenseCredentialTitle)).toBeVisible();

    await page.getByRole("button", { name: "Revisar perfil" }).click();
    await expect(
      page.getByRole("radio", { name: /Profesional · Mensual/i }),
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

    await expect(page).toHaveURL(/\/dashboard\/seguridad\?next=/);
    await page.getByRole("button", { name: "Configurar aplicación autenticadora" }).click();
    await page.locator("summary").filter({ hasText: "Ingresar la clave manualmente" }).click();
    const secret = await page.locator("details code").innerText();
    await page.getByRole("textbox", { name: "Código de seis números" }).fill(totp(secret));
    await page.getByRole("button", { name: "Verificar y continuar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Panel de revisión" }),
    ).toBeVisible();

    const downloadPath = await page.getByRole("link", { name: "Descargar documento" }).first().getAttribute("href");
    const documentResponse = await page.request.get(downloadPath!);
    expect(documentResponse.status()).toBe(200);
    expect(documentResponse.headers()["content-disposition"]).toContain("attachment;");
    expect(documentResponse.headers()["cache-control"]).toContain("no-store");

    const credentialSection = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: "Credenciales" }),
    });
    // psicopedagogo/a is a regulated type requiring BOTH the university
    // degree and the professional license approved before VERIFIED — both
    // were submitted in the onboarding test above.
    const degreeCredentialItem = credentialSection
      .locator("li")
      .filter({ hasText: AUTH_E2E.professionalFullName })
      .filter({ hasText: AUTH_E2E.credentialTitle });
    await expect(degreeCredentialItem).toContainText(AUTH_E2E.credentialTitle);
    await degreeCredentialItem
      .getByLabel(/Notas internas \/ motivo si se rechaza/i)
      .fill("Credencial ficticia aprobada por el flujo E2E local.");
    await degreeCredentialItem.getByRole("button", { name: "Aprobar" }).click();

    await expect(page).toHaveURL(/\/admin\?notice=credential-resolved$/);
    await expect(page.getByRole("status")).toContainText(
      "Decisión registrada y auditada.",
    );

    const licenseCredentialItem = credentialSection
      .locator("li")
      .filter({ hasText: AUTH_E2E.professionalFullName })
      .filter({ hasText: AUTH_E2E.licenseCredentialTitle });
    await expect(licenseCredentialItem).toContainText(
      AUTH_E2E.licenseCredentialTitle,
    );
    await licenseCredentialItem
      .getByLabel(/Notas internas \/ motivo si se rechaza/i)
      .fill("Matrícula ficticia aprobada por el flujo E2E local.");
    await licenseCredentialItem.getByRole("button", { name: "Aprobar" }).click();

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

  test("el profesional ve publicación y plan Profesional · Mensual en su dashboard", async ({
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
    await expect(page.getByRole("link", { name: "Ver perfil público", exact: true })).toHaveAttribute("href", `/profesionales/${fixture.expectedProfileSlug}`);
    await expect(page.getByRole("link", { name: "Editar mi perfil", exact: true })).toHaveAttribute("href", "/profesionales/sumarse");
    await expect(page.getByRole("link", { name: "Gestionar suscripción", exact: true })).toHaveAttribute("href", "/dashboard?seccion=suscripcion");

    const subscription = page.locator("#suscripcion");
    await expect(
      subscription.getByRole("heading", { level: 2, name: "Profesional · Mensual" }),
    ).toBeVisible();
    await expect(subscription).toContainText(
      "Tu elección está guardada. El cobro en línea todavía no está habilitado.",
    );
    await expect(subscription.getByRole("button", { name: "Continuar con el pago" })).toHaveCount(0);
    // Un retorno manipulado del navegador nunca constituye evidencia de cobro.
    await page.goto("/dashboard?subscription=checkout-return&status=approved");
    await expect(subscription.getByRole("status")).toContainText(
      "volver a esta página no lo acredita",
    );
    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      subscriptionStatus: "PENDING_PAYMENT",
    });

    // Real local intake → owned inbox → persisted status; no simulated lead API.
    await page.goto(`/profesionales/${fixture.expectedProfileSlug}#contactar`);
    await page.getByLabel("Nombre", { exact: true }).fill("Consulta local E2E");
    await page.getByLabel("Email", { exact: true }).fill("e2e.contact@universo-psi.test");
    await page.getByLabel("Motivo principal").selectOption({ index: 1 });
    await page.getByLabel("¿Cómo preferís que te respondan?").selectOption("EMAIL");
    await page.getByLabel("¿Qué te gustaría conversar?").fill("Necesito orientación para revisar mis alternativas de formación y trabajo.");
    await page.getByRole("checkbox", { name: /Acepto que Universo Psi/i }).check();
    const intake = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/leads");
    await page.getByRole("button", { name: /Enviar consulta a/ }).click();
    expect((await intake).status()).toBe(201);
    await page.goto("/dashboard?seccion=consultas");
    await expect(page.getByText("Consulta local E2E", { exact: true })).toBeVisible();
    await page.getByLabel("Estado de la consulta", { exact: true }).selectOption("VIEWED");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Estado de la consulta actualizado");
    await page.reload();
    await expect(page.getByText("Vista", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/profesionales\/sumarse$/);
    await page.getByRole("button", { name: "Elegir especialidades" }).click();
    await page
      .getByRole("button", { name: "Completar presentación" })
      .click();
    await page
      .getByLabel("Titular del perfil")
      .fill("Psicopedagogía — contenido actualizado por E2E");
    await page.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(page.getByRole("status")).toContainText("Borrador guardado");
    await expect.poll(() => fixture.readProfileSummary()).toMatchObject({
      publicationStatus: "PENDING_REVIEW",
    });
  });
});
