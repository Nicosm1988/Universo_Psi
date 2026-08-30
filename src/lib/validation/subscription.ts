import { z } from "zod";

export const selectPlanSchema = z.object({
  professionalProfileId: z.uuid(),
  planCode: z.enum(["BASE", "IMPULSO", "REFERENTE"]),
});
