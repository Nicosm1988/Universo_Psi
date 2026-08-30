import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || undefined)
  .pipe(z.httpUrl().optional());

export const onboardingSchema = z.object({
  profileId: z.uuid().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(10).max(180),
  bio: z.string().trim().min(40).max(6000),
  approach: z.string().trim().max(3000).optional(),
  experienceSummary: z.string().trim().max(3000).optional(),
  educationSummary: z.string().trim().max(3000).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "WAITLIST", "ASK"]),
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  professionalTypeId: z.uuid(),
  needIds: z.array(z.uuid()).min(1).max(8),
  serviceIds: z.array(z.uuid()).min(1).max(8),
  modalityIds: z.array(z.uuid()).min(1).max(3),
  languageIds: z.array(z.uuid()).min(1).max(8),
  planCode: z.enum(["BASE", "IMPULSO", "REFERENTE"]),
  intent: z.enum(["draft", "submit"]),
});

export const onboardingSubmissionSchema = z.object({
  profileId: z.uuid(),
  planCode: z.enum(["BASE", "IMPULSO", "REFERENTE"]),
  intent: z.literal("submit"),
});

export type OnboardingState = {
  status: "idle" | "error" | "saved" | "submitted";
  message?: string;
  profileId?: string;
  errors?: Record<string, string[]>;
};

export const initialOnboardingState: OnboardingState = { status: "idle" };
