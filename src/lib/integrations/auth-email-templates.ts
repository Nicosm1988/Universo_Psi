import "server-only";

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

export function renderAuthEmailHtml(content: AuthEmailContent, actionUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${content.heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#fbf9fc; font-family:Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbf9fc; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #ece5f5;">
          <tr>
            <td style="background-color:#1d172c; padding:32px 40px;">
              <span style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; font-weight:600; color:#ffffff; letter-spacing:-0.02em;">
                Universo <span style="color:#e8459e;">Psi</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="margin:0 0 8px 0; font-size:12px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:#a80e70;">
                ${content.kicker}
              </p>
              <h1 style="margin:0 0 16px 0; font-size:26px; line-height:1.25; font-weight:600; color:#1d172c;">
                ${content.heading}
              </h1>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#4a4458;">
                ${content.bodyText}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px; background-color:#cc148c;">
                    <a href="${actionUrl}"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">
                      ${content.buttonLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0 0; font-size:13px; line-height:1.6; color:#8a8296;">
                ${content.footerNote}
              </p>
              <p style="margin:20px 0 0 0; font-size:12px; line-height:1.6; color:#a79fb0; word-break:break-all;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
                <a href="${actionUrl}" style="color:#a80e70;">${actionUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px; background-color:#f3e6f0; border-top:1px solid #ece5f5;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#8a8296;">
                Universo Psi · La red de profesionales de salud mental.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAuthEmailText(content: AuthEmailContent, actionUrl: string): string {
  return `${content.heading}\n\n${content.bodyText}\n\n${content.buttonLabel}: ${actionUrl}\n\n${content.footerNote}\n\nUniverso Psi`;
}
