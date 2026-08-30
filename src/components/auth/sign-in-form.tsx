"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";

import { signInAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/validation/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition focus-visible:border-senda focus-visible:ring-3 focus-visible:ring-senda/15";

export function SignInForm({ next, error }: { next?: string; error?: string }) {
  const [state, formAction] = useActionState(signInAction, initialAuthState);
  const message = error || state.message;

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      {message ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
      <label className="block text-sm font-semibold text-ink">
        Email
        <input
          className={inputClass}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          aria-describedby={state.errors?.email ? "signin-email-error" : undefined}
        />
        {state.errors?.email ? (
          <span id="signin-email-error" className="mt-1 block text-sm text-red-700">
            {state.errors.email[0]}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold text-ink">
        Contraseña
        <input
          className={inputClass}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          aria-describedby={
            state.errors?.password ? "signin-password-error" : undefined
          }
        />
        {state.errors?.password ? (
          <span id="signin-password-error" className="mt-1 block text-sm text-red-700">
            {state.errors.password[0]}
          </span>
        ) : null}
      </label>
      <div className="flex justify-end">
        <Link className="text-sm font-semibold text-senda underline-offset-4 hover:underline" href="/recuperar-acceso">
          Recuperar acceso
        </Link>
      </div>
      <SubmitButton idleLabel="Ingresar" pendingLabel="Ingresando…" />
      <p className="text-center text-sm text-muted">
        ¿Todavía no tenés cuenta?{" "}
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" href={(next ? `/registro?next=${encodeURIComponent(next)}` : "/registro") as Route}>
          Registrate
        </Link>
      </p>
    </form>
  );
}
