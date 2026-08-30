"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/dal/auth";
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
