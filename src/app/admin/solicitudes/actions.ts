"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";
export async function updateLegalRequest(form: FormData) {
  await requireAdmin("/admin/solicitudes");
  const parsed = z.object({ id: z.uuid(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]), note: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/admin/solicitudes?error=1");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_legal_request", { p_id: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note });
  if (error) redirect("/admin/solicitudes?error=1");
  revalidatePath("/admin/solicitudes");
  redirect("/admin/solicitudes?ok=1");
}
