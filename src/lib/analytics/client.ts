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

/** Optional behavioral measurement is disabled, including on sensitive profile pages. */
export function trackAnalytics(
  _eventName: AnalyticsEventName,
  _context: {
    professionalProfileId?: string;
    articleId?: string;
    agreementId?: string;
    properties?: Record<string, string | number | boolean | null>;
  } = {},
) {
  // Keep the call contract while collecting no identifiers, paths or events.
  void _eventName;
  void _context;
}
