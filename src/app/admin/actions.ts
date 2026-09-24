"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/dal/auth";
import { reconcileSubscriptionResources } from "@/lib/subscriptions/reconcile-search";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendAccountEmail } from "@/lib/notifications/account-emails";
import {
  credentialResolutionSchema,
  publicationResolutionSchema,
} from "@/lib/validation/admin";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function resolveCredentialAction(formData: FormData) {
  const parsed = credentialResolutionSchema.safeParse({
    credentialId: formString(formData, "credentialId"),
    status: formString(formData, "status"),
    notes: formString(formData, "notes"),
    validUntil: formString(formData, "validUntil"),
  });
  if (!parsed.success) {
    redirect("/admin?error=credential-invalid" as Route);
  }

  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_credential", {
    p_credential_id: parsed.data.credentialId,
    p_status: parsed.data.status,
    p_internal_notes: parsed.data.notes || null,
    p_valid_until: parsed.data.validUntil || null,
  });
  if (error) {
    console.error("credential_resolution_failed", { code: error.code });
    redirect("/admin?error=credential-failed" as Route);
  }
  revalidatePath("/admin");
  redirect("/admin?notice=credential-resolved" as Route);
}

export async function resolvePublicationAction(formData: FormData) {
  const parsed = publicationResolutionSchema.safeParse({
    profileId: formString(formData, "profileId"),
    status: formString(formData, "status"),
    reason: formString(formData, "reason"),
  });
  if (!parsed.success) {
    redirect("/admin?error=publication-invalid" as Route);
  }

  await requireAdmin();
  const supabase = await createClient();
  // El correo de la persona vive en auth.users, así que se resuelve con el
  // cliente administrativo antes de que la decisión cambie el estado.
  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("professional_profiles")
    .select("user_id")
    .eq("id", parsed.data.profileId)
    .maybeSingle();

  const { error } = await supabase.rpc("admin_set_professional_publication", {
    p_profile_id: parsed.data.profileId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  if (error) {
    console.error("publication_resolution_failed", { code: error.code });
    redirect("/admin?error=publication-failed" as Route);
  }

  // Avisar la decisión: sin esto, la persona sólo se entera si vuelve a entrar.
  if (owner?.user_id) {
    const { data: account } = await admin.auth.admin.getUserById(owner.user_id);
    const email = account?.user?.email;
    if (email) {
      after(async () => {
        await sendAccountEmail(
          parsed.data.status === "PUBLISHED" ? "profile_published" : "profile_rejected",
          email,
        );
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/profesionales");
  redirect("/admin?notice=publication-resolved" as Route);
}

/**
 * Manual reconciliation: re-fetches the authoritative subscription state
 * from Mercado Pago (never trusts a client-supplied status) and applies it
 * through the same idempotent RPCs the webhook uses, including payment recovery.
 */
export async function reconcileSubscriptionAction(formData: FormData) {
  const subscriptionId = formString(formData, "subscriptionId");
  if (!z.uuid().safeParse(subscriptionId).success) {
    redirect("/admin/suscripciones?error=reconcile-invalid" as Route);
  }

  await requireAdmin();
  const supabase = await createClient();
  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select("provider, provider_account, provider_subscription_id, plan_snapshot")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (readError || !subscription?.provider_subscription_id || !subscription.provider_account) {
    redirect("/admin/suscripciones?error=reconcile-not-linked" as Route);
  }

  const paymentModel = z.enum(["RECURRING", "ONE_TIME"]).safeParse(
    (subscription.plan_snapshot as { payment_model?: string } | null)?.payment_model,
  );
  const account = z.enum(["personal", "company"]).safeParse(subscription.provider_account);
  if (!paymentModel.success || !account.success) redirect("/admin/suscripciones?error=reconcile-invalid" as Route);
  try {
    await reconcileSubscriptionResources({
      subscriptionId, providerSubscriptionId: subscription.provider_subscription_id,
      accountKey: account.data, paymentModel: paymentModel.data,
    });
  } catch {
    console.error("manual_reconciliation_failed");
    redirect("/admin/suscripciones?error=reconcile-failed" as Route);
  }

  revalidatePath("/admin/suscripciones");
  redirect("/admin/suscripciones?notice=reconcile-done" as Route);
}

/** Pauses every PAST_DUE subscription whose grace period has elapsed. */
export async function expirePastDueSubscriptionsAction() {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("expire_past_due_subscriptions");
  if (error) {
    console.error("expire_past_due_failed", error);
    redirect("/admin/suscripciones?error=expire-failed" as Route);
  }
  revalidatePath("/admin/suscripciones");
  redirect("/admin/suscripciones?notice=expire-done" as Route);
}
