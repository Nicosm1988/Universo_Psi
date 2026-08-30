"use client";

import { useEffect } from "react";

import {
  trackAnalytics,
  type AnalyticsEventName,
} from "@/lib/analytics/client";

export function AnalyticsPageView({
  eventName,
  professionalProfileId,
  articleId,
  agreementId,
}: {
  eventName: AnalyticsEventName;
  professionalProfileId?: string;
  articleId?: string;
  agreementId?: string;
}) {
  useEffect(() => {
    trackAnalytics(eventName, {
      professionalProfileId,
      articleId,
      agreementId,
    });
  }, [agreementId, articleId, eventName, professionalProfileId]);

  return null;
}
