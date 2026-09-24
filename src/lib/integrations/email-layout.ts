import "server-only";

import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

/**
 * Maqueta común a todos los correos transaccionales.
 *
 * La marca se dibuja con texto y color, no con una imagen: los clientes de
 * correo bloquean imágenes remotas por defecto, así que un logo en `<img>` se
 * ve como un recuadro roto en la primera lectura, que es justo la que importa.
 * Todo va en estilos en línea y sobre tablas porque Gmail y Outlook descartan
 * hojas de estilo y buena parte del CSS moderno.
 */
export type BrandedEmail = {
  kicker: string;
  heading: string;
  bodyText: string;
  /** Botón principal. Sin él, el correo es sólo informativo. */
  action?: { label: string; url: string };
  footerNote: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://universopsi.com";
}

export function renderBrandedEmailHtml(content: BrandedEmail): string {
  const action = content.action;
  const actionBlock = action
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px; background-color:#cc148c;">
                    <a href="${escapeHtml(action.url)}"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">
                      ${escapeHtml(action.label)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0; font-size:12px; line-height:1.6; color:#a79fb0; word-break:break-all;">
                Si el botón no funciona, copiá este enlace:<br />
                <a href="${escapeHtml(action.url)}" style="color:#a80e70;">${escapeHtml(action.url)}</a>
              </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(content.heading)}</title>
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
            <td style="padding:36px 40px 40px 40px;">
              <p style="margin:0 0 8px 0; font-size:12px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:#a80e70;">
                ${escapeHtml(content.kicker)}
              </p>
              <h1 style="margin:0 0 16px 0; font-size:26px; line-height:1.25; font-weight:600; color:#1d172c;">
                ${escapeHtml(content.heading)}
              </h1>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#4a4458;">
                ${escapeHtml(content.bodyText)}
              </p>${actionBlock}
              <p style="margin:28px 0 0 0; font-size:13px; line-height:1.6; color:#8a8296;">
                ${escapeHtml(content.footerNote)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px; background-color:#f3e6f0; border-top:1px solid #ece5f5;">
              <p style="margin:0 0 8px 0; font-size:12px; line-height:1.6; color:#8a8296;">
                Universo Psi · La red de profesionales de salud mental.
              </p>
              <p style="margin:0; font-size:12px; line-height:1.6; color:#8a8296;">
                <a href="${siteUrl()}/privacidad" style="color:#a80e70;">Privacidad</a> ·
                <a href="${siteUrl()}/terminos" style="color:#a80e70;">Términos</a> ·
                <a href="${siteUrl()}/solicitudes" style="color:#a80e70;">Baja y derechos</a> ·
                <a href="mailto:${LEGAL_CONTACT_EMAIL}" style="color:#a80e70;">${LEGAL_CONTACT_EMAIL}</a>
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

export function renderBrandedEmailText(content: BrandedEmail): string {
  const action = content.action ? `\n\n${content.action.label}: ${content.action.url}` : "";
  return `${content.heading}\n\n${content.bodyText}${action}\n\n${content.footerNote}\n\nUniverso Psi\n${siteUrl()}`;
}
