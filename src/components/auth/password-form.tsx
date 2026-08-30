"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  updatePasswordAction,
} from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/validation/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition focus-visible:border-senda focus-visible:ring-3 focus-visible:ring-senda/15";

export function PasswordResetRequestForm() {
  const [state, action] = useActionState(
    requestPasswordResetAction,
    initialAuthState,
  );
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state.message ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <label className="block text-sm font-semibold text-ink">
        Email
        <input className={inputClass} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} required />
        {state.errors?.email?.[0] ? <span className="mt-1 block text-sm text-red-700">{state.errors.email[0]}</span> : null}
      </label>
      <SubmitButton idleLabel="Enviar enlace" pendingLabel="Enviando…" />
      <Link className="block text-center text-sm font-semibold text-ink underline-offset-4 hover:underline" href="/ingresar">Volver al ingreso</Link>
    </form>
  );
}

export function PasswordUpdateForm() {
  const [state, action] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state.message ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`} role="status">{state.message}</p>
      ) : null}
      <label className="block text-sm font-semibold text-ink">
        Nueva contraseña
        <input className={inputClass} type="password" name="password" autoComplete="new-password" required />
        {state.errors?.password?.[0] ? <span className="mt-1 block text-sm text-red-700">{state.errors.password[0]}</span> : null}
      </label>
      <label className="block text-sm font-semibold text-ink">
        Repetir contraseña
        <input className={inputClass} type="password" name="confirmPassword" autoComplete="new-password" required />
        {state.errors?.confirmPassword?.[0] ? <span className="mt-1 block text-sm text-red-700">{state.errors.confirmPassword[0]}</span> : null}
      </label>
      <SubmitButton idleLabel="Actualizar contraseña" pendingLabel="Actualizando…" />
      {state.status === "success" ? <Link className="block text-center text-sm font-semibold text-ink underline" href="/dashboard">Ir al dashboard</Link> : null}
    </form>
  );
}
