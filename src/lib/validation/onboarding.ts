import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(500, "Usá una URL más corta.")
  .transform((value) => value || undefined)
  .pipe(z.httpUrl("Ingresá una URL válida.").optional());

export const onboardingSchema = z.object({
  profileId: z.uuid().optional(),
  firstName: z.string().trim().min(1, "Ingresá tu nombre.").max(80, "Usá un nombre más corto."),
  lastName: z.string().trim().min(1, "Ingresá tu apellido.").max(80, "Usá un apellido más corto."),
  headline: z
    .string()
    .trim()
    .min(10, "Contanos en pocas palabras qué ofrecés (al menos 10 caracteres).")
    .max(180, "Acortá un poco el titular (máximo 180 caracteres)."),
  bio: z
    .string()
    .trim()
    .min(40, "Contanos un poco más sobre vos (al menos 40 caracteres).")
    .max(6000, "Achicá un poco el texto (máximo 6000 caracteres)."),
  approach: z.string().trim().max(3000, "Achicá un poco el texto (máximo 3000 caracteres).").optional(),
  experienceSummary: z.string().trim().max(3000, "Achicá un poco el texto (máximo 3000 caracteres).").optional(),
  educationSummary: z.string().trim().max(3000, "Achicá un poco el texto (máximo 3000 caracteres).").optional(),
  yearsExperience: z.coerce
    .number("Ingresá un número.")
    .int("Ingresá un número entero.")
    .min(0, "No puede ser negativo.")
    .max(80, "Revisá ese número."),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "WAITLIST", "ASK"], "Elegí una disponibilidad."),
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  professionalTypeId: z.uuid("Elegí tu profesión."),
  needIds: z
    .array(z.uuid())
    .min(1, "Elegí al menos una necesidad que acompañás.")
    .max(8, "Elegí como máximo 8."),
  serviceIds: z
    .array(z.uuid())
    .min(1, "Elegí al menos un servicio que ofrecés.")
    .max(8, "Elegí como máximo 8."),
  modalityIds: z
    .array(z.uuid())
    .min(1, "Elegí al menos una modalidad.")
    .max(3, "Elegí como máximo 3."),
  languageIds: z
    .array(z.uuid())
    .min(1, "Elegí al menos un idioma.")
    .max(8, "Elegí como máximo 8."),
  planCode: z.enum(
    ["PROFESSIONAL_MONTHLY", "PROFESSIONAL_6M", "PROFESSIONAL_12M", "PROFESSIONAL_ANNUAL_UPFRONT"],
    "Elegí un plan.",
  ),
  intent: z.enum(["draft", "submit"]),
});

export const onboardingSubmissionSchema = z.object({
  profileId: z.uuid(),
  planCode: z.enum([
    "PROFESSIONAL_MONTHLY",
    "PROFESSIONAL_6M",
    "PROFESSIONAL_12M",
    "PROFESSIONAL_ANNUAL_UPFRONT",
  ]),
  intent: z.literal("submit"),
});

export type OnboardingState = {
  status: "idle" | "error" | "saved" | "submitted";
  message?: string;
  profileId?: string;
  errors?: Record<string, string[]>;
};

export const initialOnboardingState: OnboardingState = { status: "idle" };
