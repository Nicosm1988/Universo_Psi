/**
 * Consentimiento de cookies según el banner aprobado por asesoría legal.
 *
 * Sólo la categoría técnica queda activada de forma obligatoria: el resto nace
 * en `false` y únicamente cambia por una acción explícita de la persona. La
 * decisión se guarda en `localStorage` para no depender de una cookie extra
 * antes de que exista consentimiento.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "universo-psi-cookie-consent:v1";
export const COOKIE_CONSENT_VERSION = "2026-09";
export const COOKIE_CONSENT_CHANGE_EVENT = "universo-psi:cookie-consent";

export const COOKIE_CATEGORIES = [
  {
    id: "necessary",
    label: "Cookies técnicas y necesarias",
    description:
      "Son indispensables para que el sitio funcione correctamente. Permiten la navegación, el inicio de sesión seguro de los profesionales registrados y la carga del buscador. No pueden desactivarse.",
  },
  {
    id: "preferences",
    label: "Cookies de personalización y preferencias",
    description:
      "Permiten que la plataforma recuerde información relevante para modificar el comportamiento o aspecto del sitio, como el tema visual o la región de búsqueda seleccionada.",
  },
  {
    id: "analytics",
    label: "Cookies de análisis y estadística",
    description:
      "Nos ayudan a entender cómo se usa el sitio, qué secciones se visitan y cómo mejorar su velocidad y rendimiento. Universo Psi trata estos datos de forma disociada de tu identidad.",
  },
  {
    id: "external",
    label: "Cookies de funcionalidades externas (Mercado Pago)",
    description:
      "Permiten integrar la pasarela de pago externa y los complementos técnicos necesarios para contratar un plan de suscripción.",
  },
] as const;

export type CookieCategory = (typeof COOKIE_CATEGORIES)[number]["id"];
export type OptionalCookieCategory = Exclude<CookieCategory, "necessary">;

export type CookieConsent = {
  version: string;
  decidedAt: string;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  external: boolean;
};

export const OPTIONAL_COOKIE_CATEGORIES: readonly OptionalCookieCategory[] = [
  "preferences",
  "analytics",
  "external",
];

/** Estado inicial: nada opcional activado hasta que la persona decida. */
export function emptyCookieSelection(): Record<OptionalCookieCategory, boolean> {
  return { preferences: false, analytics: false, external: false };
}

export function buildCookieConsent(
  selection: Record<OptionalCookieCategory, boolean>,
  decidedAt: Date = new Date(),
): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    decidedAt: decidedAt.toISOString(),
    necessary: true,
    preferences: selection.preferences,
    analytics: selection.analytics,
    external: selection.external,
  };
}

/**
 * Sólo se acepta un registro completo de la versión vigente: si el banner
 * cambia de categorías, la decisión anterior deja de valer y se vuelve a
 * preguntar en lugar de asumir un consentimiento que nadie prestó.
 */
export function parseCookieConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== COOKIE_CONSENT_VERSION) return null;
  if (typeof record.decidedAt !== "string") return null;
  if (OPTIONAL_COOKIE_CATEGORIES.some((category) => typeof record[category] !== "boolean")) {
    return null;
  }
  return {
    version: COOKIE_CONSENT_VERSION,
    decidedAt: record.decidedAt,
    necessary: true,
    preferences: record.preferences === true,
    analytics: record.analytics === true,
    external: record.external === true,
  };
}

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Almacenamiento bloqueado: la decisión rige para esta navegación y se
    // vuelve a pedir en la próxima visita.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: consent }));
}

export function hasCookieConsentFor(category: OptionalCookieCategory): boolean {
  return readCookieConsent()?.[category] === true;
}
