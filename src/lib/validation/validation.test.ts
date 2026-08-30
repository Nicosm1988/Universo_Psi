import { describe, expect, it } from "vitest";

import {
  credentialResolutionSchema,
  publicationResolutionSchema,
} from "./admin";
import {
  analyticsPropertiesAreSafe,
  analyticsSchema,
} from "./analytics";
import { signInSchema, signUpSchema } from "./auth";
import { leadSchema } from "./lead";
import { onboardingSchema } from "./onboarding";
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
    planCode: "BASE",
    intent: "submit",
  } as const;

  it("coerces numbers and removes blank optional values", () => {
    const parsed = onboardingSchema.parse(onboarding);

    expect(parsed.yearsExperience).toBe(12);
    expect(parsed).not.toHaveProperty("startingPrice");
    expect(parsed.linkedinUrl).toBeUndefined();
    expect(parsed.websiteUrl).toBe("https://example.com");
  });

  it("rejects incomplete taxonomy selections and unsafe URLs", () => {
    expect(
      onboardingSchema.safeParse({
        ...onboarding,
        needIds: [],
        websiteUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
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
        planCode: "IMPULSO",
      }).success,
    ).toBe(true);
    expect(
      selectPlanSchema.safeParse({
        professionalProfileId,
        planCode: "ENTERPRISE",
      }).success,
    ).toBe(false);
  });
});
