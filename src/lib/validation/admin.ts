import { z } from "zod";

export const credentialResolutionSchema = z
  .object({
    credentialId: z.uuid(),
    status: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().trim().max(2000).optional(),
    validUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.status !== "REJECTED" || Boolean(data.notes), {
    message: "El rechazo necesita un motivo.",
    path: ["notes"],
  });

export const publicationResolutionSchema = z
  .object({
    profileId: z.uuid(),
    status: z.enum(["PUBLISHED", "REJECTED", "SUSPENDED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => data.status === "PUBLISHED" || Boolean(data.reason),
    { message: "La decisión necesita un motivo.", path: ["reason"] },
  );
