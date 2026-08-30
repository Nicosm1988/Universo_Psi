"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";
import { updateLeadStatusSchema } from "@/lib/validation/dashboard";

export async function updateLeadStatusAction(formData: FormData) {
  const parsed = updateLeadStatusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=lead-invalid#leads" as Route);
  }

  await requireCurrentUser("/dashboard");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_professional_lead_status", {
    p_lead_id: parsed.data.leadId,
    p_new_status: parsed.data.status,
  });
  if (error) {
    console.error("lead_status_update_failed", { code: error.code });
    redirect("/dashboard?error=lead-transition#leads" as Route);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=lead-updated#leads" as Route);
}
