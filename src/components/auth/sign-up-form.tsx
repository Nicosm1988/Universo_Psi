"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/app/(auth)/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/validation/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition focus-visible:border-senda focus-visible:ring-3 focus-visible:ring-senda/15";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? (
    <span id={id} className="mt-1 block text-sm text-red-700">
      {errors[0]}
    </span>
  ) : null;
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signUpAction, initialAuthState);
  const professionalIntent = next?.startsWith("/profesionales/sumarse") ?? false;

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state.message ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <GoogleSignInButton next={next} />
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        o con tu email
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <label className="block text-sm font-semibold text-ink">
        Nombre y apellido
        <input
          className={inputClass}
          name="fullName"
          autoComplete="name"
          required
          aria-describedby={state.errors?.fullName ? "signup-name-error" : undefined}
        />
        <FieldError id="signup-name-error" errors={state.errors?.fullName} />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Quiero</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-paper px-4 has-checked:border-senda has-checked:ring-2 has-checked:ring-senda/15">
            <input type="radio" name="accountType" value="PERSON" defaultChecked={!professionalIntent} />
            <span className="text-sm font-medium">Encontrar acompañamiento</span>
          </label>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-paper px-4 has-checked:border-senda has-checked:ring-2 has-checked:ring-senda/15">
            <input type="radio" name="accountType" value="PROFESSIONAL" defaultChecked={professionalIntent} />
            <span className="text-sm font-medium">Ofrecer mis servicios</span>
          </label>
        </div>
      </fieldset>
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
          aria-describedby={state.errors?.email ? "signup-email-error" : undefined}
        />
        <FieldError id="signup-email-error" errors={state.errors?.email} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Contraseña
          <input
            className={inputClass}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            aria-describedby={state.errors?.password ? "signup-password-error" : undefined}
          />
          <FieldError id="signup-password-error" errors={state.errors?.password} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Repetir contraseña
          <input
            className={inputClass}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            aria-describedby={
              state.errors?.confirmPassword ? "signup-confirm-error" : undefined
            }
          />
          <FieldError id="signup-confirm-error" errors={state.errors?.confirmPassword} />
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Mínimo 10 caracteres, con mayúscula, minúscula y número.
      </p>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
        <input className="mt-1 size-4" type="checkbox" name="terms" required />
        <span>
          Acepto los{" "}
          <Link className="font-semibold text-ink underline" href="/terminos">
            términos
          </Link>{" "}
          y la{" "}
          <Link className="font-semibold text-ink underline" href="/privacidad">
            política de privacidad
          </Link>
          .
          <FieldError id="signup-terms-error" errors={state.errors?.terms} />
        </span>
      </label>
      <SubmitButton idleLabel="Crear cuenta" pendingLabel="Creando cuenta…" />
      <p className="text-center text-sm text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/ingresar">
          Ingresá
        </Link>{" "}
        ·{" "}
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/recuperar-acceso">
          Olvidé mi contraseña
        </Link>
      </p>
    </form>
  );
}
