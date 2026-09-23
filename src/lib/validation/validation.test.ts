import { describe, expect, it } from "vitest";

import {
  credentialResolutionSchema,
  publicationResolutionSchema,
} from "./admin";
import {
  analyticsPropertiesAreSafe,
  analyticsSchema,
} from "./analytics";
import { passwordUpdateSchema, signInSchema, signUpSchema } from "./auth";
import { leadSchema } from "./lead";
import { onboardingSchema } from "./onboarding";
import { supportRequestSchema } from "./support";
import { SUPPORT_CONSENT_VERSION } from "@/lib/legal";
import { selectPlanSchema } from "./subscription";

const professionalProfileId = "11111111-1111-4111-8111-111111111101";
const credentialId = "22222222-2222-4222-8222-222222222202";
const professionalTypeId = "33333333-3333-4333-8333-333333333303";
const needId = "44444444-4444-4444-8444-444444444404";
const serviceId = "55555555-5555-4555-8555-555555555505";
const modalityId = "66666666-6666-4666-8666-666666666606";
const languageId = "77777777-7777-4777-8777-777777777707";
const anonymousId = "88888888-8888-4888-8888-888888888808";

describe("auth validation", () => {
  it("normalizes an email before sign in", () => {
    const parsed = signInSchema.parse({
      email: "  PERSONA@EXAMPLE.COM ",
      password: "secret",
    });

    expect(parsed.email).toBe("persona@example.com");
  });

  it("accepts a strong, confirmed registration", () => {
    const result = signUpSchema.safeParse({
      fullName: "  Ana Pérez  ",
      email: "ANA@EXAMPLE.COM",
      password: "Carrera2026Segura",
      confirmPassword: "Carrera2026Segura",
      accountType: "PERSON",
      terms: "on",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Ana Pérez");
      expect(result.data.email).toBe("ana@example.com");
    }
  });

  it.each(["Aa1" + "x".repeat(70), "Aa1" + "é".repeat(35)])("rejects passwords beyond the Auth byte limit", (password) => {
    const credentials = { password, confirmPassword: password };
    expect(passwordUpdateSchema.safeParse(credentials).success).toBe(false);
    expect(signUpSchema.safeParse({ ...credentials, fullName: "Persona de prueba", email: "persona@example.com", accountType: "PERSON", terms: "on" }).success).toBe(false);
  });

  it.each([
    ["a weak password", { password: "short", confirmPassword: "short" }],
    [
      "a mismatched confirmation",
      {
        password: "Carrera2026Segura",
        confirmPassword: "Carrera2026Distinta",
      },
    ],
    [
      "missing consent",
      {
        password: "Carrera2026Segura",
        confirmPassword: "Carrera2026Segura",
        terms: undefined,
      },
    ],
  ])("rejects %s", (_case, overrides) => {
    const registration = {
      fullName: "Ana Pérez",
      email: "ana@example.com",
      password: "Carrera2026Segura",
      confirmPassword: "Carrera2026Segura",
      accountType: "PERSON",
      terms: "on",
    };
    const result = signUpSchema.safeParse(
      Object.assign({}, registration, overrides),
    );

    expect(result.success).toBe(false);
  });

});

describe("lead validation", () => {
  const validLead = {
    professionalProfileId,
    name: "  Julia Díaz ",
    email: "  JULIA@EXAMPLE.COM ",
    phone: "  ",
    message: "  Necesito ordenar mi próximo cambio profesional.  ",
    consent: true,
    consentVersion: "2026-08",
    landingPath: "/profesionales/valentina-acosta",
  } as const;

  it("normalizes a valid contact request and applies public defaults", () => {
    const parsed = leadSchema.parse(validLead);

    expect(parsed).toMatchObject({
      professionalProfileId,
      name: "Julia Díaz",
      email: "julia@example.com",
      message: "Necesito ordenar mi próximo cambio profesional.",
      contactPreference: "ANY",
      source: "professional-profile",
      consentVersion: "2026-08",
    });
    expect(parsed.phone).toBeUndefined();
  });

  it.each([
    ["an invalid profile id", { professionalProfileId: "not-a-uuid" }],
    ["a short message", { message: "Muy breve" }],
    ["missing consent", { consent: false }],
    ["a protocol-relative landing path", { landingPath: "//evil.example/path" }],
    ["a changed consent version", { consentVersion: "2025-01" }],
  ])("rejects %s", (_case, overrides) => {
    expect(leadSchema.safeParse({ ...validLead, ...overrides }).success).toBe(
      false,
    );
  });

  it("requires a phone for phone or WhatsApp contact", () => {
    expect(
      leadSchema.safeParse({
        ...validLead,
        contactPreference: "WHATSAPP",
      }).success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({
        ...validLead,
        phone: "+54 11 5555 5555",
        contactPreference: "WHATSAPP",
      }).success,
    ).toBe(true);
  });
});

describe("analytics validation", () => {
  it("accepts a documented, PII-free event", () => {
    const result = analyticsSchema.safeParse({
      eventName: "filter_applied",
      anonymousId,
      path: "/profesionales/valentina-acosta",
      professionalProfileId,
      properties: { active_count: 3 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        analyticsPropertiesAreSafe(
          result.data.eventName,
          result.data.properties,
        ),
      ).toBe(true);
    }
  });

  it.each([
    ["an unknown event", { eventName: "password_captured" }],
    ["an external path", { path: "https://evil.example" }],
    ["a malformed property name", { properties: { "Email Address": "a@b.c" } }],
  ])("rejects %s", (_case, overrides) => {
    const result = analyticsSchema.safeParse({
      eventName: "search_started",
      path: "/profesionales",
      properties: {},
      ...overrides,
    });

    expect(result.success).toBe(false);
  });

  it("enforces the separate property count and byte-size guard", () => {
    const tooManyProperties = Object.fromEntries(
      Array.from({ length: 13 }, (_, index) => [`value_${index}`, index]),
    );
    const tooLarge = { context: "x".repeat(4097) };

    expect(
      analyticsPropertiesAreSafe("signup_started", tooManyProperties),
    ).toBe(false);
    expect(analyticsPropertiesAreSafe("signup_started", tooLarge)).toBe(false);
    expect(
      analyticsPropertiesAreSafe("signup_started", { source: "home" }),
    ).toBe(true);
    expect(
      analyticsPropertiesAreSafe("search_started", { source: "home" }),
    ).toBe(false);
  });
});

describe("professional onboarding and moderation validation", () => {
  const onboarding = {
    firstName: "Valentina",
    lastName: "Acosta",
    headline: "Acompaño decisiones profesionales con perspectiva humana.",
    bio: "Trabajo con personas que necesitan explorar alternativas y construir criterios propios para decidir su próximo paso.",
    approach: "Conversaciones y experimentos breves.",
    experienceSummary: "Doce años de práctica profesional.",
    educationSummary: "Licenciatura y formación de posgrado.",
    yearsExperience: "12",
    availabilityStatus: "AVAILABLE",
    linkedinUrl: "",
    websiteUrl: "https://example.com",
    professionalTypeId,
    needIds: [needId],
    serviceIds: [serviceId],
    modalityIds: [modalityId],
    languageIds: [languageId],
    planCode: "PROFESSIONAL_MONTHLY",
    intent: "submit",
  } as const;

  it("allows a draft without profession or any categories", () => {
    expect(onboardingSchema.safeParse({ ...onboarding, professionalTypeId: "", needIds: [], serviceIds: [], modalityIds: [], languageIds: [], headline: "", bio: "", intent: "draft" }).success).toBe(true);
  });

  it("coerces numbers and removes blank optional values", () => {
    const parsed = onboardingSchema.parse(onboarding);

    expect(parsed.yearsExperience).toBe(12);
    expect(parsed).not.toHaveProperty("startingPrice");
    expect(parsed.linkedinUrl).toBeUndefined();
    expect(parsed.websiteUrl).toBe("https://example.com");
  });

  it("permite presentación pendiente y descarta enlaces incompletos sin almacenarlos", () => {
    const parsed = onboardingSchema.parse({ ...onboarding, headline: "", bio: "", linkedinUrl: "prueba", websiteUrl: "javascript:alert(1)", intent: "draft" });
    expect(parsed.headline).toBe("");
    expect(parsed.bio).toBe("");
    expect(parsed.linkedinUrl).toBeUndefined();
    expect(parsed.websiteUrl).toBeUndefined();
  });

  it("discards unsafe URLs while allowing incomplete draft categories", () => {
    const parsed = onboardingSchema.parse({ ...onboarding, needIds: [], websiteUrl: "javascript:alert(1)" });
    expect(parsed.needIds).toEqual([]);
    expect(parsed.websiteUrl).toBeUndefined();
  });

  it("requires a reason for moderation rejections", () => {
    expect(
      credentialResolutionSchema.safeParse({
        credentialId,
        status: "REJECTED",
      }).success,
    ).toBe(false);
    expect(
      publicationResolutionSchema.safeParse({
        profileId: professionalProfileId,
        status: "SUSPENDED",
      }).success,
    ).toBe(false);

    expect(
      credentialResolutionSchema.safeParse({
        credentialId,
        status: "REJECTED",
        notes: "El documento no permite comprobar la matrícula.",
      }).success,
    ).toBe(true);
  });

  it("only accepts the published plan catalog", () => {
    expect(
      selectPlanSchema.safeParse({
        professionalProfileId,
        planCode: "PROFESSIONAL_MONTHLY",
      }).success,
    ).toBe(true);
    expect(
      selectPlanSchema.safeParse({
        professionalProfileId,
        planCode: "NONEXISTENT",
      }).success,
    ).toBe(false);
    expect(
      selectPlanSchema.safeParse({
        professionalProfileId,
        planCode: "ENTERPRISE",
      }).success,
    ).toBe(false);
  });
});

describe("support request validation", () => {
  const validRequest = {
    topic: "REPORTE",
    name: "  Julia Díaz ",
    email: "  JULIA@EXAMPLE.COM ",
    message: "  Encontré un perfil que usa la matrícula de otra persona.  ",
    consent: true,
    consentVersion: SUPPORT_CONSENT_VERSION,
    landingPath: "/contacto",
  } as const;

  it("normalizes a valid message", () => {
    expect(supportRequestSchema.parse(validRequest)).toMatchObject({
      topic: "REPORTE",
      name: "Julia Díaz",
      email: "julia@example.com",
      message: "Encontré un perfil que usa la matrícula de otra persona.",
    });
  });

  it.each([
    ["an unknown topic", { topic: "CUALQUIERA" }],
    // Bajas y derechos de datos viven en /solicitudes: este canal no los acepta.
    ["a rights request that belongs in /solicitudes", { topic: "BAJA" }],
    ["a short message", { message: "Muy breve" }],
    ["missing consent", { consent: false }],
    ["a protocol-relative landing path", { landingPath: "//evil.example/path" }],
    ["a changed consent version", { consentVersion: "2025-01" }],
  ])("rejects %s", (_case, overrides) => {
    expect(supportRequestSchema.safeParse({ ...validRequest, ...overrides }).success).toBe(false);
  });
});
