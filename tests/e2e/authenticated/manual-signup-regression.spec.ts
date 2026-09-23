import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { assertLoopbackHttpUrl, readLocalAuthE2EEnvironment } from "./helpers/local-supabase-fixture";
import { TERMS_VERSION } from "../../../src/lib/legal";

const cases = [
  { name: "alta manual válida", mode: "valid", initialPassword: "" },
  { name: "contraseña inválida conserva datos y permite corregir", mode: "validation", initialPassword: "corta" },
  { name: "rechazo inyectado del proveedor conserva los datos", mode: "provider", initialPassword: "LocalProviderReject1!" },
  { name: "fallo inyectado de transporte conserva los datos", mode: "transport", initialPassword: "LocalTransportReject1!" },
] as const;

for (const scenario of cases) {
  test(scenario.name, async ({ page, baseURL }) => {
    test.skip(
      (scenario.mode === "provider" || scenario.mode === "transport") && process.env.PSI_SIGNUP_FAULT_INJECTION !== "true",
      "Requiere el interceptor de fetch exclusivo del harness local, no un proveedor real.",
    );
    const environment = readLocalAuthE2EEnvironment();
    assertLoopbackHttpUrl(baseURL ?? "", "baseURL registro E2E");
    const mailpitUrl = process.env.SUPABASE_TEST_MAILPIT_URL;
    test.skip(!mailpitUrl, "Requiere buzón local explícito para acreditar la confirmación, sin correo real.");
    const mailpitOrigin = assertLoopbackHttpUrl(mailpitUrl!, "SUPABASE_TEST_MAILPIT_URL").origin;
    const backend = createClient(environment.supabaseUrl, environment.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `e2e.signup.${scenario.mode}.${randomUUID()}@universo-psi.test`;
    const fullName = "Registro Manual E2E";
    const password = `Local-valid-${randomUUID()}!`;
    const initialPassword = scenario.initialPassword || password;
    const next = "/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY";
    const findOwnAccount = async () => {
      const users = await backend.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(users.error).toBeNull();
      return users.data.users.find((user) => user.email === email);
    };

    try {
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
      });
      await page.goto(`/registro?next=${encodeURIComponent(next)}`);
      await page.getByLabel("Nombre y apellido", { exact: true }).fill(fullName);
      await page.getByLabel("Email", { exact: true }).fill(email);
      // Choose the non-default radio to detect accidental reset to intent defaults.
      await page.getByRole("radio", { name: "Encontrar acompañamiento" }).check();
      await page.locator('input[name="password"]').fill(initialPassword);
      await page.locator('input[name="confirmPassword"]').fill(initialPassword);
      const terms = page.getByRole("checkbox", { name: /Acepto los términos/i });
      await terms.check();
      await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();

      if (scenario.mode !== "valid") {
        const status = page.getByRole("status");
        if (scenario.mode === "validation") {
          await expect(page.getByText("Usá al menos 10 caracteres.", { exact: true })).toBeVisible();
          await expect(page.locator('input[name="password"]')).toBeFocused();
        } else if (scenario.mode === "provider") {
          await expect(status).toContainText("Esa contraseña es débil.");
        } else {
          await expect(status).toContainText("No pudimos conectar con el servicio de registro.");
          await expect(status).not.toContainText("problema técnico");
        }
        await expect(page.getByLabel("Nombre y apellido", { exact: true })).toHaveValue(fullName);
        await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
        await expect(page.locator('input[name="password"]')).toHaveValue(initialPassword);
        await expect(page.locator('input[name="confirmPassword"]')).toHaveValue(initialPassword);
        await expect(page.getByRole("radio", { name: "Encontrar acompañamiento" })).toBeChecked();
        await expect(terms).toBeChecked();
        await expect(page.locator('input[name="next"]')).toHaveValue(next);
        expect(await findOwnAccount()).toBeUndefined();

        if (scenario.mode === "provider" || scenario.mode === "transport") return;

        // Correct only the passwords; preserved fields are not entered again.
        await page.locator('input[name="password"]').fill(password);
        await page.locator('input[name="confirmPassword"]').fill(password);
        await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
      }

      await expect(page.getByRole("status")).toContainText("Revisá tu email para confirmar la cuenta.");
      await expect(page.locator('input[name="password"]')).toHaveValue("");
      await expect(page.locator('input[name="confirmPassword"]')).toHaveValue("");
      const account = await findOwnAccount();
      expect(account).toBeDefined();
      expect(account!.email_confirmed_at).toBeFalsy();
      await expect.poll(async () => {
        const response = await fetch(`${mailpitOrigin}/api/v1/messages?limit=100`);
        expect(response.status).toBe(200);
        const inbox = await response.json() as {
          messages: Array<{ To: Array<{ Address: string }>; Subject: string }>;
        };
        return inbox.messages.some((message) =>
          message.To.some((recipient) => recipient.Address.toLowerCase() === email) &&
          /confirm/i.test(message.Subject),
        );
      }).toBe(true);
      await test.info().attach("confirmación en buzón local", {
        body: Buffer.from(JSON.stringify({ localOnly: true, recipientMatched: true, confirmationMessageCaptured: true, confirmationLinkNotOpened: true })),
        contentType: "application/json",
      });
      expect(account!.user_metadata).toMatchObject({ display_name: fullName, requested_account_type: "PERSON" });
      const profile = await backend.from("user_profiles").select("terms_version").eq("id", account!.id).single();
      expect(profile.error).toBeNull();
      expect(profile.data?.terms_version).toBe(TERMS_VERSION);
      const professional = await backend.from("professional_profiles").select("id").eq("user_id", account!.id);
      expect(professional.error).toBeNull();
      expect(professional.data).toEqual([]);
    } finally {
      // No admin-create bypass: the UI alone registers this fresh account.
      // Backend access reads evidence and deletes only this generated test user.
      const account = await findOwnAccount();
      if (account) {
        const deleted = await backend.auth.admin.deleteUser(account.id);
        expect(deleted.error).toBeNull();
      }
    }
  });
}
