import { defineConfig, devices } from "@playwright/test";

import {
  assertLoopbackHttpUrl,
  readLocalAuthE2EEnvironment,
} from "./tests/e2e/authenticated/helpers/local-supabase-fixture";

const environment = readLocalAuthE2EEnvironment();
const appUrl =
  process.env.PLAYWRIGHT_AUTH_BASE_URL?.trim() ?? "http://127.0.0.1:3179";
const parsedAppUrl = assertLoopbackHttpUrl(
  appUrl,
  "PLAYWRIGHT_AUTH_BASE_URL",
);
if (parsedAppUrl.pathname !== "/" || parsedAppUrl.search || parsedAppUrl.hash) {
  throw new Error(
    "PLAYWRIGHT_AUTH_BASE_URL debe señalar sólo al origen local de la aplicación.",
  );
}
const port = parsedAppUrl.port || "80";

export default defineConfig({
  testDir: "./tests/e2e/authenticated",
  outputDir: "test-results/authenticated",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: parsedAppUrl.origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "authenticated-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: parsedAppUrl.origin,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: parsedAppUrl.origin,
      NEXT_PUBLIC_SUPABASE_URL: environment.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: environment.publishableKey,
      SUPABASE_SECRET_KEY: environment.secretKey,
      RATE_LIMIT_SALT: "universo-psi-auth-e2e-local-only-salt",
      UNIVERSO_PSI_TEST_MODE: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
