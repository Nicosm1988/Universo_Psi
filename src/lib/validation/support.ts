import { z } from "zod";

import { SUPPORT_CONSENT_VERSION } from "@/lib/legal";

/**
 * Motivos del formulario de contacto general.
 *
 * Los derechos sobre datos, la baja y el arrepentimiento NO están acá: tienen su
 * propio canal en `/solicitudes`, que deja constancia al solicitante y una
 * bandeja administrativa con eventos inmutables. Duplicarlos partiría el rastro
 * de un pedido con plazos legales entre dos bandejas.
 */
export const SUPPORT_TOPICS = [
  { value: "REPORTE", label: "Reportar un perfil falso o un contenido ofensivo" },
  { value: "SEGURIDAD", label: "Informar una vulnerabilidad o un problema de seguridad" },
  { value: "SOPORTE", label: "Ayuda con el uso de la plataforma" },
  { value: "COMERCIAL", label: "Consulta comercial o institucional" },
  { value: "OTRO", label: "Otro motivo" },
] as const;

export const supportTopicSchema = z.enum(
  SUPPORT_TOPICS.map((topic) => topic.value) as [string, ...string[]],
);

export const supportRequestSchema = z.object({
  topic: supportTopicSchema,
  name: z.string().trim().min(2, "Ingresá tu nombre.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido.")),
  message: z
    .string()
    .trim()
    .min(20, "Contanos un poco más para poder resolver tu pedido.")
    .max(4000),
  consent: z.literal(true, {
    error: "Necesitamos tu consentimiento para responder la consulta.",
  }),
  consentVersion: z.literal(SUPPORT_CONSENT_VERSION),
  landingPath: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"))
    .optional(),
  website: z.string().max(200).optional(),
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
