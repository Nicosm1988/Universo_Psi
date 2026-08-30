import { z } from "zod";

export const updateLeadStatusSchema = z.object({
  leadId: z.uuid(),
  status: z.enum(["VIEWED", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED", "SPAM"]),
});
