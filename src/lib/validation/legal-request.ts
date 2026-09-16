import { z } from "zod";

export const legalRequestKinds = {
  CANCELLATION: "Baja del servicio",
  WITHDRAWAL: "Arrepentimiento de la contratación",
  ACCESS: "Acceso a mis datos",
  CORRECTION: "Corrección de mis datos",
  DELETION: "Eliminación de mis datos o cuenta",
  COMPLAINT: "Reclamo o consulta de soporte",
} as const;
export const legalRequestSchema = z.object({
  kind: z.enum(["CANCELLATION", "WITHDRAWAL", "ACCESS", "CORRECTION", "DELETION", "COMPLAINT"]),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  message: z.string().trim().min(10).max(2000),
  requestId: z.uuid(),
});
