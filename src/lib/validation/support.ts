import { z } from "zod";

import { SUPPORT_CONSENT_VERSION } from "@/lib/legal";

/**
 * Motivos del formulario de contacto de la plataforma. Los tres primeros
 * corresponden a derechos y reportes que los documentos legales remiten
 * expresamente a este canal.
 */
export const SUPPORT_TOPICS = [
  { value: "PRIVACIDAD", label: "Derechos sobre mis datos (acceso, rectificación o supresión)" },
  { value: "BAJA", label: "Baja de mi cuenta o de mi plan de suscripción" },
  { value: "REPORTE", label: "Reportar un perfil falso o un contenido ofensivo" },
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
