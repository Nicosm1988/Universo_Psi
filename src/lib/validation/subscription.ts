import { z } from "zod";

export const selectPlanSchema = z.object({
  professionalProfileId: z.uuid(),
  planCode: z.enum([
    "PROFESSIONAL_MONTHLY",
    "PROFESSIONAL_6M",
    "PROFESSIONAL_12M",
    "PROFESSIONAL_ANNUAL_UPFRONT",
  ]),
});
