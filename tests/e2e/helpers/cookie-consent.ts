import type { PlaywrightTestOptions } from "@playwright/test";

import {
  buildCookieConsent,
  COOKIE_CONSENT_STORAGE_KEY,
  emptyCookieSelection,
} from "../../../src/lib/consent/cookies";

/**
 * Los recorridos que no están probando el banner arrancan con una decisión ya
 * tomada: sin ella, el banner tapa controles al pie y la medición opcional
 * quedaría activa. Se siembra el rechazo de todo lo opcional, que es el estado
 * más restrictivo.
 */
export function cookieConsentStorageState(origin: string): PlaywrightTestOptions["storageState"] {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: COOKIE_CONSENT_STORAGE_KEY,
            value: JSON.stringify(
              buildCookieConsent(emptyCookieSelection(), new Date("2026-09-22T00:00:00.000Z")),
            ),
          },
        ],
      },
    ],
  };
}
