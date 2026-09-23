"use client";

import { Button } from "@/components/ui/button";
import { openCookiePreferences } from "@/lib/consent/use-cookie-consent";

export function CookiePreferencesButton({
  className = "",
  label = "Configurar cookies",
  variant = "secondary",
}: {
  className?: string;
  label?: string;
  variant?: "primary" | "secondary" | "quiet" | "inverse";
}) {
  return (
    <Button className={className} variant={variant} onClick={openCookiePreferences}>
      {label}
    </Button>
  );
}
