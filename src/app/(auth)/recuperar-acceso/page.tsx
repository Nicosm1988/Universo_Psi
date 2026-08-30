import type { Metadata } from "next";

import { PasswordResetRequestForm } from "@/components/auth/password-form";

export const metadata: Metadata = {
  title: "Recuperar acceso | Universo Psi",
  robots: { index: false, follow: false },
};

export default function RecoverAccessPage() {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Acceso seguro</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">Recuperá tu cuenta.</h1>
      <p className="mt-4 leading-relaxed text-muted">Te enviaremos un enlace de un solo uso si el email está registrado.</p>
      <PasswordResetRequestForm />
    </>
  );
}
