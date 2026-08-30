import type { Metadata } from "next";

import { PasswordUpdateForm } from "@/components/auth/password-form";

export const metadata: Metadata = {
  title: "Actualizar contraseña | Universo Psi",
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Nueva contraseña</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">Elegí una clave segura.</h1>
      <p className="mt-4 leading-relaxed text-muted">Usá una combinación que no repitas en otros servicios.</p>
      <PasswordUpdateForm />
    </>
  );
}
