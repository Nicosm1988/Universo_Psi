import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  type BrandedEmail,
} from "./email-layout";

const base: BrandedEmail = {
  kicker: "Seguridad",
  heading: "Tu contraseña fue actualizada",
  bodyText: "Cambiamos la contraseña de tu cuenta.",
  footerNote: "Si no fuiste vos, escribinos.",
};

describe("branded email layout", () => {
  it("renders the wordmark and the legal footer", () => {
    const html = renderBrandedEmailHtml(base);

    expect(html).toContain("Universo <span");
    expect(html).toContain("/privacidad");
    expect(html).toContain("/terminos");
    expect(html).toContain("/solicitudes");
    expect(html).toContain("hola@universosenda.com");
  });

  it("omits the button when there is no action", () => {
    expect(renderBrandedEmailHtml(base)).not.toContain("Si el botón no funciona");
    // El pie siempre lleva el sitio; lo que no debe aparecer es una llamada a la acción.
    expect(renderBrandedEmailText(base)).not.toContain("Ir a mi cuenta");
  });

  it("includes the action in both renderings", () => {
    const withAction: BrandedEmail = {
      ...base,
      action: { label: "Ir a mi cuenta", url: "https://universopsi.com/ingresar" },
    };

    expect(renderBrandedEmailHtml(withAction)).toContain("https://universopsi.com/ingresar");
    expect(renderBrandedEmailText(withAction)).toContain("Ir a mi cuenta: https://universopsi.com/ingresar");
  });

  // Los nombres los escribe la persona: sin escapado, un perfil podría inyectar
  // marcado en el correo de otra.
  it("escapes values that come from user input", () => {
    const html = renderBrandedEmailHtml({
      ...base,
      heading: '<img src=x onerror="alert(1)">',
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
});
