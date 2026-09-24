import "server-only";

import { deliverTransactionalEmail } from "@/lib/integrations/email";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  type BrandedEmail,
} from "@/lib/integrations/email-layout";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://universopsi.com";
}

/**
 * Avisos sobre la propia cuenta. Se mandan al correo con el que la persona se
 * registró y nunca incluyen datos de terceros ni el contenido de una consulta:
 * un correo puede quedar abierto en una pantalla ajena.
 *
 * A diferencia de las consultas, que pasan por el outbox con reintentos, estos
 * son avisos puntuales que acompañan una acción ya confirmada. Si el envío
 * falla, la acción igual se completó y se registra el fallo sin romper el flujo.
 */
const TEMPLATES = {
  password_changed: (): BrandedEmail => ({
    kicker: "Seguridad de tu cuenta",
    heading: "Tu contraseña fue actualizada",
    bodyText:
      "Acabamos de cambiar la contraseña de tu cuenta en Universo Psi. Si fuiste vos, no hace falta que hagas nada.",
    action: { label: "Ir a mi cuenta", url: `${siteUrl()}/ingresar` },
    footerNote:
      "Si no reconocés este cambio, escribinos de inmediato: puede que alguien tenga acceso a tu casilla de correo.",
  }),

  profile_published: (): BrandedEmail => ({
    kicker: "Tu perfil",
    heading: "Tu perfil ya está publicado",
    bodyText:
      "Revisamos tu documentación y tu perfil ya aparece en el catálogo de Universo Psi. Desde ahora podés recibir consultas.",
    action: { label: "Ver mi perfil", url: `${siteUrl()}/profesionales/sumarse` },
    footerNote:
      "Mantené tus datos y tu matrícula al día. Si dejás de ejercer, pedí la baja desde tu cuenta.",
  }),

  profile_rejected: (): BrandedEmail => ({
    kicker: "Tu perfil",
    heading: "Tu perfil necesita correcciones",
    bodyText:
      "Revisamos tu perfil y todavía no podemos publicarlo. Entrá a tu cuenta para ver qué falta y volver a enviarlo.",
    action: { label: "Revisar mi perfil", url: `${siteUrl()}/profesionales/sumarse` },
    footerNote:
      "Por privacidad, el detalle de la revisión se consulta dentro de tu cuenta y no viaja por correo.",
  }),

  account_closed: (): BrandedEmail => ({
    kicker: "Baja de cuenta",
    heading: "Tu cuenta fue dada de baja",
    bodyText:
      "Procesamos tu pedido de baja. Tu perfil ya no figura en el catálogo y dejaste de recibir consultas.",
    footerNote:
      "Conservamos únicamente lo que la ley nos obliga a conservar. Si fue un error, escribinos y lo revisamos.",
  }),
} as const;

export type AccountEmailKind = keyof typeof TEMPLATES;

const SUBJECTS: Record<AccountEmailKind, string> = {
  password_changed: "Tu contraseña de Universo Psi fue actualizada",
  profile_published: "Tu perfil ya está publicado en Universo Psi",
  profile_rejected: "Tu perfil en Universo Psi necesita correcciones",
  account_closed: "Tu cuenta de Universo Psi fue dada de baja",
};

export async function sendAccountEmail(kind: AccountEmailKind, to: string) {
  const content = TEMPLATES[kind]();
  const result = await deliverTransactionalEmail({
    to,
    subject: SUBJECTS[kind],
    text: renderBrandedEmailText(content),
    html: renderBrandedEmailHtml(content),
  });
  if (result.status === "failed") {
    // Sin la dirección: el registro no debe filtrar a quién se escribió.
    console.error("account_email_failed", { kind });
  }
  return result;
}
