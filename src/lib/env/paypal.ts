import { z } from "zod";

export const paypalPriceSchema = z.object({
  currency: z.literal("USD"),
  amount: z.string().regex(/^(0|[1-9]\d{0,7})\.\d{2}$/).refine(value => Number(value) > 0),
  planId: z.string().regex(/^P-[A-Za-z0-9]+$/).optional(),
}).strict();
export const paypalPlansSchema = z.object({
  PROFESSIONAL_MONTHLY: paypalPriceSchema.extend({ planId: z.string().regex(/^P-[A-Za-z0-9]+$/) }).optional(),
  PROFESSIONAL_ANNUAL_UPFRONT: paypalPriceSchema.optional(),
}).strict();
const plans = z.string().refine(value => {
  try { return paypalPlansSchema.safeParse(JSON.parse(value)).success; } catch { return false; }
}, "PayPal plans must be valid USD prices and plan IDs").optional();
export const paypalEnvFields = {
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_LIVE_CHECKOUT_ENABLED: z.enum(["false", "true"]).default("false"),
  PAYPAL_SANDBOX_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_SANDBOX_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_SANDBOX_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_SANDBOX_PLANS: plans,
  PAYPAL_LIVE_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_LIVE_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_LIVE_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_LIVE_PLANS: plans,
};
