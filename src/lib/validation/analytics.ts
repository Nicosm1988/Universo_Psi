import { z } from "zod";

export const analyticsEventNames = [
  "search_started",
  "filter_applied",
  "professional_card_viewed",
  "professional_profile_viewed",
  "contact_started",
  "lead_created",
  "signup_started",
  "professional_signup_completed",
  "subscription_started",
  "article_viewed",
  "agreement_viewed",
] as const;

const scalar = z.union([z.string().max(160), z.number().finite(), z.boolean(), z.null()]);

export const analyticsSchema = z.object({
  eventName: z.enum(analyticsEventNames),
  anonymousId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
  path: z
    .string()
    .max(500)
    .regex(/^\/(?!\/)[^?#]*$/)
    .optional(),
  professionalProfileId: z.uuid().optional(),
  articleId: z.uuid().optional(),
  agreementId: z.uuid().optional(),
  properties: z.record(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), scalar).default({}),
});

const allowedProperties: Record<(typeof analyticsEventNames)[number], readonly string[]> = {
  search_started: [],
  filter_applied: ["active_count"],
  professional_card_viewed: ["placement"],
  professional_profile_viewed: [],
  contact_started: [],
  lead_created: [],
  signup_started: ["source"],
  professional_signup_completed: [],
  subscription_started: ["plan_code"],
  article_viewed: [],
  agreement_viewed: [],
};

export function analyticsPropertiesAreSafe(
  eventName: (typeof analyticsEventNames)[number],
  properties: Record<string, unknown>,
) {
  const entries = Object.entries(properties);
  if (
    entries.length > 12 ||
    new TextEncoder().encode(JSON.stringify(properties)).byteLength > 4096
  ) {
    return false;
  }

  return entries.every(([key, value]) => {
    if (!allowedProperties[eventName].includes(key)) return false;
    if (typeof value === "number") {
      return Number.isInteger(value) && value >= 0 && value <= 10_000;
    }
    if (typeof value === "string") return /^[a-z0-9_-]{1,40}$/.test(value);
    return typeof value === "boolean" || value === null;
  });
}
