"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  type CookieConsent,
} from "@/lib/consent/cookies";

export const COOKIE_PREFERENCES_OPEN_EVENT = "universo-psi:cookie-preferences-open";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
  // Una pestaña hermana puede cambiar la decisión: `storage` la propaga.
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** El valor crudo es estable entre lecturas, que es lo que exige el store. */
function getStoredValue(): string | null {
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Devuelve `undefined` en el render del servidor y en la hidratación, para no
 * mostrar el banner ni activar mediciones antes de leer la decisión guardada.
 */
export function useCookieConsent(): CookieConsent | null | undefined {
  const raw = useSyncExternalStore(subscribe, getStoredValue, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parseCookieConsent(raw)), [raw]);
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
}
