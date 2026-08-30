"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env/public";
import { safeInternalPath } from "@/lib/http/origin";
import { TERMS_VERSION } from "@/lib/legal";
import { createAdminClient, findAdminUserIdByEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
  type AuthFormState,
} from "@/lib/validation/auth";

// A single test account (this founder's own inbox) that always behaves like
// a brand-new signup when submitted through /registro, so it can be reused
// for repeated E2E QA runs without leaving stale "already registered"
// state — but never touches the profile data attached to that account.
const TEST_ACCOUNT_RESET_EMAIL = "nmarcosan@gmail.com";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalidState(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): AuthFormState {
  return {
    status: "error",
    message: "Revisá los datos marcados.",
    errors: error.flatten().fieldErrors,
  };
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    next: formValue(formData, "next"),
  });

  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("signin_failed", { code: error.code, status: error.status });
    return {
      status: "error",
      message: "No pudimos iniciar sesión. Revisá tus datos o recuperá tu acceso.",
    };
  }

  const { data: legalProfile } = await supabase
    .from("user_profiles")
    .select("terms_version")
    .eq("id", data.user.id)
    .maybeSingle();
  if (legalProfile?.terms_version !== TERMS_VERSION) {
    const acceptanceUrl = new URL("/aceptar-terminos", publicEnv.NEXT_PUBLIC_SITE_URL);
    acceptanceUrl.searchParams.set("next", safeInternalPath(parsed.data.next ?? null));
    redirect(`${acceptanceUrl.pathname}${acceptanceUrl.search}` as Route);
  }

  redirect(safeInternalPath(parsed.data.next ?? null) as Route);
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formValue(formData, "fullName"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    accountType: formValue(formData, "accountType"),
    terms: formValue(formData, "terms"),
    next: formValue(formData, "next"),
  });

  if (!parsed.success) return invalidState(parsed.error);

  const next = safeInternalPath(
    parsed.data.next ?? null,
    parsed.data.accountType === "PROFESSIONAL"
      ? "/profesionales/sumarse"
      : "/dashboard",
  );
  const callback = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", next);

  const supabase = await createClient();

  if (parsed.data.email.trim().toLowerCase() === TEST_ACCOUNT_RESET_EMAIL) {
    const existingUserId = await findAdminUserIdByEmail(parsed.data.email);
    if (existingUserId) {
      const admin = createAdminClient();
      const { error: resetError } = await admin.auth.admin.updateUserById(existingUserId, {
        password: parsed.data.password,
        email_confirm: false,
      });
      if (resetError) {
        console.error("test_account_reset_failed", { code: resetError.code });
        return {
          status: "error",
          message: "No pudimos reiniciar la cuenta de prueba. Probá de nuevo.",
        };
      }

      // supabase.auth.resend() silently no-ops here: GoTrue only resends
      // within an existing pending-confirmation token window, which an
      // admin-driven email_confirm:false reset does not create. generateLink
      // mints a fresh signup token itself, which reliably fires the Send
      // Email hook.
      const { error: linkError } = await admin.auth.admin.generateLink({
        type: "signup",
        email: parsed.data.email,
        password: parsed.data.password,
        options: { redirectTo: callback.toString() },
      });
      if (linkError) {
        console.error("test_account_generate_link_failed", { code: linkError.code });
        return {
          status: "error",
          message: "No pudimos reenviar el mail de confirmación. Probá de nuevo.",
        };
      }

      return {
        status: "success",
        message: "Revisá tu email para confirmar la cuenta. El enlace vence por seguridad.",
      };
    }
    console.info("test_account_reset_user_not_found", { email: parsed.data.email });
    // First time this test email signs up: fall through to a normal signup.
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback.toString(),
      data: {
        display_name: parsed.data.fullName,
        requested_account_type: parsed.data.accountType,
        terms_version: TERMS_VERSION,
      },
    },
  });

  if (error) {
    console.error("signup_failed", { code: error.code, status: error.status });
    return {
      status: "error",
      message:
        "No pudimos crear la cuenta. Probá de nuevo o ingresá si ya te registraste.",
    };
  }

  if (data.user) {
    const admin = createAdminClient();
    const { error: acceptanceError } = await admin.rpc(
      "accept_terms_from_signup_backend",
      {
        p_user_id: data.user.id,
        p_terms_version: TERMS_VERSION,
      },
    );
    if (acceptanceError) {
      console.error("signup_legal_acceptance_failed", {
        code: acceptanceError.code,
      });
    }
  }

  console.info("signup_result", {
    hasSession: Boolean(data.session),
    identityCount: data.user?.identities?.length ?? null,
  });

  if (!data.session) {
    return {
      status: "success",
      message:
        "Revisá tu email para confirmar la cuenta. El enlace vence por seguridad.",
    };
  }

  const { data: legalProfile } = await supabase
    .from("user_profiles")
    .select("terms_version")
    .eq("id", data.session.user.id)
    .maybeSingle();
  if (legalProfile?.terms_version !== TERMS_VERSION) {
    const acceptanceUrl = new URL("/aceptar-terminos", publicEnv.NEXT_PUBLIC_SITE_URL);
    acceptanceUrl.searchParams.set("next", next);
    redirect(`${acceptanceUrl.pathname}${acceptanceUrl.search}` as Route);
  }

  redirect(next as Route);
}

export async function acceptCurrentTermsAction(formData: FormData) {
  const next = safeInternalPath(formValue(formData, "next"));
  if (formValue(formData, "terms") !== "on") {
    const retry = new URL("/aceptar-terminos", publicEnv.NEXT_PUBLIC_SITE_URL);
    retry.searchParams.set("next", next);
    retry.searchParams.set("error", "Necesitamos tu aceptación para continuar.");
    redirect(`${retry.pathname}${retry.search}` as Route);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/ingresar" as Route);
  const { error } = await supabase.rpc("accept_current_terms", {
    p_terms_version: TERMS_VERSION,
  });
  if (error) {
    const retry = new URL("/aceptar-terminos", publicEnv.NEXT_PUBLIC_SITE_URL);
    retry.searchParams.set("next", next);
    retry.searchParams.set("error", "No pudimos registrar tu aceptación. Probá nuevamente.");
    redirect(`${retry.pathname}${retry.search}` as Route);
  }
  redirect(next as Route);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formValue(formData, "email"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const callback = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", "/actualizar-contrasena");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callback.toString(),
  });

  return {
    status: "success",
    message:
      "Si existe una cuenta con ese email, vas a recibir un enlace para recuperar el acceso.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });
  if (!parsed.success) return invalidState(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return {
      status: "error",
      message: "El enlace venció. Solicitá uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      status: "error",
      message: "No pudimos actualizar la contraseña. Solicitá un enlace nuevo.",
    };
  }

  return {
    status: "success",
    message: "Tu contraseña quedó actualizada. Ya podés volver al dashboard.",
  };
}
