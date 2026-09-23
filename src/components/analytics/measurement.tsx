"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect } from "react";

import { useCookieConsent } from "@/lib/consent/use-cookie-consent";

/**
 * La medición de producto sólo se carga con consentimiento de la categoría de
 * análisis. Cuando se revoca, además de dejar de cargarla, se borran los
 * identificadores de navegador que hubiera dejado una visita anterior.
 */
export function Measurement() {
  const consent = useCookieConsent();
  const allowed = consent?.analytics === true;

  useEffect(() => {
    if (allowed) return;
    try {
      window.localStorage.removeItem("universo-psi-anonymous-id");
      window.sessionStorage.removeItem("universo-psi-session-id");
    } catch {
      // Almacenamiento bloqueado: no hay identificadores que borrar.
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
