import { z } from "zod";

// Only the short-lived provider token crosses our server boundary, never card fields.
export const subscriptionCardSchema = z.object({
  subscriptionId: z.uuid(),
  payerEmail: z.email().max(254),
  cardTokenId: z.string().regex(/^[a-zA-Z0-9_-]{16,256}$/),
  consent: z.literal(true),
}).strict();
