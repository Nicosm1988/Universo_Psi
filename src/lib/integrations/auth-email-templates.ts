import "server-only";

import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  type BrandedEmail,
} from "@/lib/integrations/email-layout";

type AuthEmailContent = {
  subject: string;
  kicker: string;
  heading: string;
  bodyText: string;
  buttonLabel: string;
  footerNote: string;
};

const DEFAULT_CONTENT: AuthEmailContent = {
  subject: "Tu enlace para ingresar a Universo Psi",
  kicker: "Ingresar",
  heading: "Ingresá a tu cuenta",
  bodyText: "Tocá el botón para ingresar a tu cuenta de Universo Psi.",
  buttonLabel: "Continuar",
  footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email.",
};

const CONTENT_BY_ACTION_TYPE: Record<string, AuthEmailContent> = {
  signup: {
    subject: "Confirmá tu cuenta en Universo Psi",
    kicker: "Empezá por acá",
    heading: "Confirmá tu cuenta",
    bodyText:
      "Falta un paso para activar tu cuenta en Universo Psi. Confirmá tu email para poder buscar acompañamiento o publicar tu perfil profesional.",
    buttonLabel: "Confirmar mi cuenta",
    footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email — tu dirección no fue registrada.",
  },
  recovery: {
    subject: "Recuperá tu contraseña de Universo Psi",
    kicker: "Recuperación de cuenta",
    heading: "Elegí una nueva contraseña",
    bodyText:
      "Recibimos un pedido para restablecer la contraseña de tu cuenta en Universo Psi. Tocá el botón para elegir una nueva.",
    buttonLabel: "Elegir nueva contraseña",
    footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email — tu contraseña sigue igual.",
  },
  email_change: {
    subject: "Confirmá tu nuevo email en Universo Psi",
    kicker: "Cambio de email",
    heading: "Confirmá tu nuevo email",
    bodyText: "Pediste cambiar el email de tu cuenta en Universo Psi. Confirmalo para que el cambio se haga efectivo.",
    buttonLabel: "Confirmar nuevo email",
    footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email.",
  },
  invite: {
    subject: "Te invitaron a Universo Psi",
    kicker: "Invitación",
    heading: "Te invitaron a Universo Psi",
    bodyText: "Alguien te invitó a sumarte a Universo Psi. Aceptá la invitación para crear tu cuenta.",
    buttonLabel: "Aceptar invitación",
    footerNote: "El enlace vence por seguridad. Si no esperabas esta invitación, podés ignorar este email.",
  },
  magiclink: {
    subject: "Tu enlace para ingresar a Universo Psi",
    kicker: "Ingresar",
    heading: "Ingresá a tu cuenta",
    bodyText: "Tocá el botón para ingresar a tu cuenta de Universo Psi sin contraseña.",
    buttonLabel: "Ingresar",
    footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email.",
  },
  reauthentication: {
    subject: "Confirmá que sos vos — Universo Psi",
    kicker: "Verificación",
    heading: "Confirmá que sos vos",
    bodyText: "Estás por hacer un cambio sensible en tu cuenta de Universo Psi. Confirmá tu identidad para continuar.",
    buttonLabel: "Confirmar identidad",
    footerNote: "El enlace vence por seguridad. Si no lo pediste vos, ignorá este email.",
  },
};

export function resolveAuthEmailContent(actionType: string): AuthEmailContent {
  return CONTENT_BY_ACTION_TYPE[actionType] ?? DEFAULT_CONTENT;
}

function toBrandedEmail(content: AuthEmailContent, actionUrl: string): BrandedEmail {
  return {
    kicker: content.kicker,
    heading: content.heading,
    bodyText: content.bodyText,
    action: { label: content.buttonLabel, url: actionUrl },
    footerNote: content.footerNote,
  };
}

export function renderAuthEmailHtml(content: AuthEmailContent, actionUrl: string): string {
  return renderBrandedEmailHtml(toBrandedEmail(content, actionUrl));
}

export function renderAuthEmailText(content: AuthEmailContent, actionUrl: string): string {
  return renderBrandedEmailText(toBrandedEmail(content, actionUrl));
}
