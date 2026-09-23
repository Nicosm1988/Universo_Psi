"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]),
  note: z.string().trim().max(4000).optional(),
});

export async function updateSupportRequest(form: FormData) {
  await requireAdmin("/admin/contacto");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/admin/contacto?error=1");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_support_request", {
    p_request_id: parsed.data.id,
    p_status: parsed.data.status,
    p_internal_notes: parsed.data.note || null,
  });
  if (error) {
    console.error("support_resolution_failed", { code: error.code });
    redirect("/admin/contacto?error=1");
  }
  revalidatePath("/admin/contacto");
  redirect("/admin/contacto?ok=1");
}
