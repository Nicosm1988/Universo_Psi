import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  assertLoopbackHttpUrl,
  readLocalAuthE2EEnvironment,
} from "./helpers/local-supabase-fixture";

// Real local Auth/DB and Server Actions; Mercado Pago stays unconfigured.
// This verifies that checkout intent is independent from publication review.
const scenarios = [
  { name: "presentación vacía", presentation: "", chooseType: true, chooseCategories: true },
  { name: "presentación breve y enlaces incompletos", presentation: "prueba", chooseType: true, chooseCategories: true },
  { name: "presentación vacía sin especialidades", presentation: "", chooseType: true, chooseCategories: false },
  { name: "presentación breve sin clasificación profesional", presentation: "prueba", chooseType: false, chooseCategories: false },
] as const;

for (const scenario of scenarios) {
  const { presentation } = scenario;
  test(`${scenario.name} permite guardar y continuar al pago sin revisión`, async ({
    page,
    baseURL,
  }) => {
    const environment = readLocalAuthE2EEnvironment();
    assertLoopbackHttpUrl(baseURL ?? "", "baseURL E2E");
    expect(process.env.MERCADOPAGO_CHECKOUT_ENABLED ?? "false").toBe("false");
    expect(process.env.MERCADOPAGO_PERSONAL_ACCESS_TOKEN).toBeFalsy();
    expect(process.env.MERCADOPAGO_COMPANY_ACCESS_TOKEN).toBeFalsy();
    const backend = createClient(environment.supabaseUrl, environment.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = randomUUID();
    const email = `e2e.optional.${suffix}@universo-psi.test`;
    const password = `Local-only-${suffix}!`;
    const created = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Presentación opcional E2E" },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;
    let profileId: string | undefined;

    try {
      // Block external browser destinations as a second guard; server MP config
      // is independently absent in the local runner.
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
      });
      const onboardingPath = "/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY";
      await page.goto(`/ingresar?next=${encodeURIComponent(onboardingPath)}`);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Contraseña", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(page).toHaveURL(/\/aceptar-terminos\?next=/);
      await page.getByRole("checkbox", { name: /Leí y acepto los términos/i }).check();
      await page.getByRole("button", { name: "Aceptar y continuar" }).click();
      await expect(page).toHaveURL(/\/profesionales\/sumarse\?plan=PROFESSIONAL_MONTHLY$/);

      await page.getByLabel("Nombre", { exact: true }).fill("Perfil");
      await page.getByLabel("Apellido", { exact: true }).fill("Opcional E2E");
      if (scenario.chooseType) {
        await page.getByLabel("Tipo de profesional").selectOption({ label: "Psicólogo/a" });
      }
      await page.getByRole("button", { name: "Elegir especialidades" }).click();
      if (scenario.chooseCategories) {
        await page.getByRole("group", { name: "¿En qué necesidades acompañás?" }).getByLabel(/^Ansiedad/i).first().check();
        await page.getByRole("group", { name: "¿Qué servicios ofrecés?" }).getByLabel(/^Terapia individual/i).check();
        await page.getByRole("group", { name: "Modalidades" }).getByLabel("Online", { exact: true }).check();
        await page.getByRole("group", { name: "Idiomas de atención" }).getByLabel("Español", { exact: true }).check();
      }
      await page.getByRole("button", { name: "Completar presentación" }).click();
      await expect(page.getByText("Estos datos son opcionales por ahora.", { exact: false })).toBeVisible();
      for (const label of ["Titular del perfil", "Sobre vos", "Cómo trabajás", "Experiencia relevante", "Formación", "LinkedIn", "Sitio web"]) {
        await page.getByLabel(label, { exact: true }).fill(presentation);
      }
      await page.getByRole("button", { name: "Guardar y continuar" }).click();
      await expect(page.getByRole("status")).toContainText("Borrador guardado");
      await expect(page.getByRole("heading", { name: "Documentación privada" })).toBeVisible();

      const draft = await backend.from("professional_profiles")
        .select("id,headline,bio,linkedin_url,website_url,publication_status,verification_state")
        .eq("user_id", userId).single();
      expect(draft.error).toBeNull();
      profileId = draft.data!.id;
      expect(draft.data).toMatchObject({
        headline: presentation,
        bio: presentation,
        linkedin_url: null,
        website_url: null,
        publication_status: "DRAFT",
        verification_state: "NOT_VERIFIED",
      });

      if (!scenario.chooseCategories) {
        for (const table of ["professional_needs", "professional_services", "professional_modalities", "professional_languages"]) {
          const relations = await backend.from(table).select("professional_profile_id").eq("professional_profile_id", profileId!);
          expect(relations.error).toBeNull();
          expect(relations.data).toEqual([]);
        }
      }
      if (!scenario.chooseType) {
        const types = await backend.from("professional_profile_types").select("professional_profile_id").eq("professional_profile_id", profileId!);
        expect(types.error).toBeNull();
        expect(types.data).toEqual([]);
      }

      // Skip documents using the normal next-step control. Never submit review.
      await page.getByRole("button", { name: "Revisar perfil", exact: true }).click();
      await expect(page.getByRole("radio", { name: /Profesional · Mensual/i })).toBeChecked();
      await expect(page.getByRole("button", { name: "Enviar a revisión", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Continuar al pago", exact: true }).click();
      await expect(page.getByRole("status")).toContainText(
        "Tu borrador está guardado. No pudimos abrir el pago; podés reintentarlo desde Suscripción en tu panel.",
      );
      await expect(page.getByRole("status")).not.toContainText("Perfil enviado");
      await expect(page).toHaveURL(/\/profesionales\/sumarse/);

      const persisted = await backend.from("professional_profiles")
        .select("publication_status,verification_state,published_at")
        .eq("id", profileId!).single();
      expect(persisted.error).toBeNull();
      expect(persisted.data).toMatchObject({ publication_status: "DRAFT", verification_state: "NOT_VERIFIED", published_at: null });
      const subscriptions = await backend.from("subscriptions")
        .select("status,plan_snapshot,provider_account,provider_subscription_id,last_payment_at,current_period_end")
        .eq("professional_profile_id", profileId!);
      expect(subscriptions.error).toBeNull();
      expect(subscriptions.data).toHaveLength(1);
      expect(subscriptions.data![0]).toMatchObject({
        status: "PENDING_PAYMENT",
        plan_snapshot: { code: "PROFESSIONAL_MONTHLY", price_amount: 120000, currency: "ARS" },
        provider_account: null,
        provider_subscription_id: null,
        last_payment_at: null,
        current_period_end: null,
      });
      const documents = await backend.storage.from("professional-credentials").list(userId);
      expect(documents.error).toBeNull();
      expect(documents.data).toEqual([]);
    } finally {
      // Unique per-test identity; never remove existing/shared fixtures.
      if (!profileId) {
        const existing = await backend.from("professional_profiles").select("id").eq("user_id", userId).maybeSingle();
        profileId = existing.data?.id;
      }
      if (profileId) {
        const subscriptions = await backend.from("subscriptions").delete().eq("professional_profile_id", profileId);
        expect(subscriptions.error).toBeNull();
        const profile = await backend.from("professional_profiles").delete().eq("id", profileId);
        expect(profile.error).toBeNull();
      }
      const deleted = await backend.auth.admin.deleteUser(userId);
      expect(deleted.error).toBeNull();
    }
  });
}
