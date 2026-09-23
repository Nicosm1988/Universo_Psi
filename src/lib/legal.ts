/**
 * Versión vigente del paquete legal. `private.accept_current_terms` exige que
 * TERMS y PRIVACY compartan versión, así que una nueva redacción sustancial de
 * cualquiera de los dos documentos obliga a publicar ambos con la misma etiqueta
 * y a registrar una aceptación nueva.
 */
export const TERMS_VERSION = "2026-09.1";

/** Texto de consentimiento del formulario de consulta a profesionales. */
export const LEAD_CONSENT_VERSION = "2026-08";

/** Texto de consentimiento del formulario de contacto con la plataforma. */
export const SUPPORT_CONSENT_VERSION = "2026-09";

/** Canal de contacto publicado en los documentos legales. */
export const LEGAL_CONTACT_EMAIL = "hola@universosenda.com";

export const TERMS_VERSION_LABEL = "Versión septiembre de 2026 · revisión 1";
export const PRIVACY_VERSION_LABEL = "Versión septiembre de 2026 · revisión 1";

/**
 * Titular del sitio y responsable de la base de datos. La Ley N° 24.240 y la
 * Ley N° 25.326 exigen identificarlo de forma accesible: se publica en el
 * encabezado de ambos documentos legales y en sus canales de contacto.
 */
export const LEGAL_ENTITY = {
  name: "Nicolás San Marco",
  taxId: "20-33556056-7",
  address: "Av. Coronel Díaz 1465, Ciudad Autónoma de Buenos Aires",
} as const;
