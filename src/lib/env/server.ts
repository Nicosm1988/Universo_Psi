import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  RATE_LIMIT_SALT: z.string().min(16),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.email().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(16).optional(),
  SENTRY_DSN: z.url().optional(),
  UNIVERSO_PSI_TEST_MODE: z.enum(["true", "false"]).default("false"),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  MERCADOPAGO_ACCESS_TOKEN:
    process.env.MERCADOPAGO_ACCESS_TOKEN || undefined,
  MERCADOPAGO_WEBHOOK_SECRET:
    process.env.MERCADOPAGO_WEBHOOK_SECRET || undefined,
  SENTRY_DSN: process.env.SENTRY_DSN || undefined,
  UNIVERSO_PSI_TEST_MODE: process.env.UNIVERSO_PSI_TEST_MODE ?? "false",
});

if (
  process.env.VERCEL_ENV === "production" &&
  serverEnv.UNIVERSO_PSI_TEST_MODE === "true"
) {
  throw new Error("UNIVERSO_PSI_TEST_MODE cannot be enabled in Vercel Production.");
}
