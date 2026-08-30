"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/dal/auth";
import {
  SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS,
  fetchPreapproval,
  type PaymentAccountKey,
} from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  credentialResolutionSchema,
  publicationResolutionSchema,
} from "@/lib/validation/admin";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function requireAdmin() {
  const user = await requireCurrentUser("/admin");
  if (!user.roles.some((role) => role === "ADMIN" || role === "SUPERADMIN")) {
    redirect("/dashboard" as Route);
  }
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
  const { error } = await supabase.rpc("admin_set_professional_publication", {
    p_profile_id: parsed.data.profileId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  if (error) {
    console.error("publication_resolution_failed", { code: error.code });
    redirect("/admin?error=publication-failed" as Route);
  }
  revalidatePath("/admin");
  revalidatePath("/profesionales");
  redirect("/admin?notice=publication-resolved" as Route);
}

/**
 * Manual reconciliation: re-fetches the authoritative subscription state
 * from Mercado Pago (never trusts a client-supplied status) and applies it
 * through the same idempotent RPC the webhook uses. Only supports
 * RECURRING (Preapproval) subscriptions today — one-time payments have no
 * standalone resource to re-fetch once the original webhook is processed.
 */
export async function reconcileSubscriptionAction(formData: FormData) {
  const subscriptionId = formString(formData, "subscriptionId");
  if (!subscriptionId) {
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

  const paymentModel = (subscription.plan_snapshot as { payment_model?: string } | null)
    ?.payment_model;
  if (paymentModel === "ONE_TIME") {
    redirect("/admin/suscripciones?error=reconcile-one-time-unsupported" as Route);
  }

  try {
    const preapproval = await fetchPreapproval(
      subscription.provider_subscription_id,
      subscription.provider_account as PaymentAccountKey,
    );
    const mappedStatus = SUBSCRIPTION_STATUS_BY_PREAPPROVAL_STATUS[preapproval.status];

    const admin = createAdminClient();
    const { error } = await admin.rpc("apply_subscription_webhook_event", {
      p_provider_subscription_id: preapproval.id,
      p_external_event_id: `manual:${Date.now()}`,
      p_event_type: "manual_reconciliation",
      p_status: mappedStatus ?? null,
      p_period_start: null,
      p_period_end: null,
      p_next_payment_at: preapproval.nextPaymentDate,
      p_payload: preapproval.raw,
      p_occurred_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.error("manual_reconciliation_failed", error);
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
