"use client";

export type AnalyticsEventName =
  | "search_started"
  | "filter_applied"
  | "professional_card_viewed"
  | "professional_profile_viewed"
  | "contact_started"
  | "lead_created"
  | "signup_started"
  | "professional_signup_completed"
  | "subscription_started"
  | "article_viewed"
  | "agreement_viewed";

function browserIdentifier(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

export function trackAnalytics(
  eventName: AnalyticsEventName,
  context: {
    professionalProfileId?: string;
    articleId?: string;
    agreementId?: string;
    properties?: Record<string, string | number | boolean | null>;
  } = {},
) {
  if (typeof window === "undefined") return;

  let anonymousId: string | undefined;
  let sessionId: string | undefined;
  try {
    anonymousId = browserIdentifier(localStorage, "universo-psi-anonymous-id");
    sessionId = browserIdentifier(sessionStorage, "universo-psi-session-id");
  } catch {
    anonymousId = crypto.randomUUID();
    sessionId = crypto.randomUUID();
  }

  void fetch("/api/analytics", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      anonymousId,
      sessionId,
      path: window.location.pathname,
      ...context,
    }),
  }).catch(() => undefined);
}
