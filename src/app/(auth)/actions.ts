"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env/public";
import { safeInternalPath } from "@/lib/http/origin";
import {
  renderAuthEmailHtml,
  renderAuthEmailText,
  resolveAuthEmailContent,
} from "@/lib/integrations/auth-email-templates";
import { deliverTransactionalEmail } from "@/lib/integrations/email";
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

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeInternalPath(formValue(formData, "next"));
  const callback = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) {
    console.error("google_signin_failed", { code: error?.code });
    const errorUrl = new URL("/ingresar", publicEnv.NEXT_PUBLIC_SITE_URL);
    errorUrl.searchParams.set("error", "No pudimos iniciar sesión con Google. Probá de nuevo.");
    redirect(`${errorUrl.pathname}${errorUrl.search}` as Route);
  }

  redirect(data.url as Route);
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

      // Neither supabase.auth.resend() nor generateLink({type:"signup"})
      // work here: resend silently no-ops (no pending token to resend) and
      // generateLink's signup type refuses with "email_exists" because the
      // row still exists (we only flip email_confirm, we never delete it —
      // deleting would cascade and wipe the profile, which must survive).
      // generateLink's recovery type has no such guard and, once the link
      // is verified, GoTrue confirms the email as a side effect — so it
      // reliably re-establishes a fresh, confirmed session for this account.
      // generateLink never sends anything itself (by design — it hands back
      // the token so the caller can deliver it), so we send it ourselves
      // through the same branded pipeline the Send Email hook uses.
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: { redirectTo: callback.toString() },
      });
      if (linkError || !linkData.properties?.hashed_token) {
        console.error("test_account_generate_link_failed", { code: linkError?.code });
        return {
          status: "error",
          message: "No pudimos reenviar el mail de confirmación. Probá de nuevo.",
        };
      }

      const actionUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
      actionUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
      actionUrl.searchParams.set("type", "recovery");
      actionUrl.searchParams.set("next", next);
      // GoTrue's recovery link is the only mechanism that works for an
      // existing, admin-reset row (see comment above), but its default
      // copy talks about a forgotten password — wrong framing for what is,
      // from this account's point of view, a fresh signup. Override it.
      const content = {
        ...resolveAuthEmailContent("recovery"),
        subject: "Confirmá el acceso a tu cuenta de prueba de Universo Psi",
        kicker: "Cuenta de prueba",
        heading: "Confirmá el acceso",
        bodyText:
          "Reiniciamos tu cuenta de prueba en Universo Psi para que puedas volver a probar el registro desde cero. Tocá el botón para confirmar el acceso con tu nueva contraseña.",
        buttonLabel: "Confirmar acceso",
      };
      const delivery = await deliverTransactionalEmail({
        to: parsed.data.email,
        subject: content.subject,
        text: renderAuthEmailText(content, actionUrl.toString()),
        html: renderAuthEmailHtml(content, actionUrl.toString()),
      });
      if (delivery.status !== "sent") {
        console.error("test_account_email_delivery_failed", { status: delivery.status });
        return {
          status: "error",
          message: "No pudimos enviar el mail de confirmación. Probá de nuevo.",
        };
      }

      return {
        status: "success",
        message: "Revisá tu email para completar el acceso a la cuenta de prueba. El enlace vence por seguridad.",
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
