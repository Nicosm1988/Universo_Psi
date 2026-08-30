import { z } from "zod";

const optionalTrimmed = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

export const leadSchema = z.object({
  professionalProfileId: z.uuid("El perfil profesional no es válido."),
  name: z.string().trim().min(2, "Ingresá tu nombre.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un email válido.")),
  phone: optionalTrimmed(40),
  message: z
    .string()
    .trim()
    .min(10, "Contanos un poco más para orientar la consulta.")
    .max(4000),
  contactPreference: z
    .enum(["EMAIL", "PHONE", "WHATSAPP", "ANY"])
    .default("ANY"),
  needId: z.uuid().optional(),
  consent: z.literal(true, {
    error: "Necesitamos tu consentimiento para enviar la consulta.",
  }),
  consentVersion: z.literal("2026-08"),
  source: z.string().trim().min(1).max(80).default("professional-profile"),
  campaign: optionalTrimmed(160),
  utmSource: optionalTrimmed(160),
  utmMedium: optionalTrimmed(160),
  utmCampaign: optionalTrimmed(160),
  landingPath: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"))
    .optional(),
  website: z.string().max(200).optional(),
}).superRefine((data, context) => {
  if (
    (data.contactPreference === "PHONE" ||
      data.contactPreference === "WHATSAPP") &&
    !data.phone
  ) {
    context.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Ingresá un teléfono para esa preferencia de contacto.",
    });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;
