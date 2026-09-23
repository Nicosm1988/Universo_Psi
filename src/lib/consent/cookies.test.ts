import { describe, expect, it } from "vitest";

import {
  buildCookieConsent,
  COOKIE_CONSENT_VERSION,
  emptyCookieSelection,
  parseCookieConsent,
} from "@/lib/consent/cookies";

describe("cookie consent", () => {
  it("starts with every optional category disabled", () => {
    expect(emptyCookieSelection()).toEqual({
      preferences: false,
      analytics: false,
      external: false,
    });
  });

  it("marks the technical category as always granted", () => {
    const consent = buildCookieConsent(emptyCookieSelection(), new Date("2026-09-22T12:00:00Z"));

    expect(consent).toEqual({
      version: COOKIE_CONSENT_VERSION,
      decidedAt: "2026-09-22T12:00:00.000Z",
      necessary: true,
      preferences: false,
      analytics: false,
      external: false,
    });
  });

  it("reads back a stored decision", () => {
    const consent = buildCookieConsent({ preferences: true, analytics: false, external: true });

    expect(parseCookieConsent(JSON.stringify(consent))).toEqual(consent);
  });

  it.each([
    ["nothing stored", null],
    ["broken json", "{"],
    ["a non-object", '"granted"'],
    [
      "a previous banner version",
      JSON.stringify({ version: "2026-01", decidedAt: "2026-01-01T00:00:00.000Z", preferences: true, analytics: true, external: true }),
    ],
    [
      "a record missing a category",
      JSON.stringify({ version: COOKIE_CONSENT_VERSION, decidedAt: "2026-09-22T00:00:00.000Z", preferences: true, analytics: true }),
    ],
    [
      "a category that is not a boolean",
      JSON.stringify({ version: COOKIE_CONSENT_VERSION, decidedAt: "2026-09-22T00:00:00.000Z", preferences: "yes", analytics: true, external: true }),
    ],
  ])("asks again when it finds %s", (_case, raw) => {
    expect(parseCookieConsent(raw)).toBeNull();
  });
});
