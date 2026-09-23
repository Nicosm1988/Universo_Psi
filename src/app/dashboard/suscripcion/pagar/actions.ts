"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/dal/auth";
import { createCheckoutRedirectUrl } from "@/lib/subscriptions/checkout";
import { createClient } from "@/lib/supabase/server";

export async function startHostedSubscriptionCheckoutAction(formData: FormData) {
  await requireCurrentUser("/dashboard");
  const input = z.object({ subscriptionId: z.uuid(), payerEmail: z.email().max(254).optional() }).safeParse({
    subscriptionId: formData.get("subscriptionId"),
    payerEmail: formData.get("payerEmail") ?? undefined,
  });
  if (!input.success) redirect("/dashboard?subscription=checkout-error#suscripcion" as Route);
  const supabase = await createClient();
  const { data: profile, error } = await supabase.rpc("my_professional_profile").select("id").maybeSingle();
  if (error || !profile) redirect("/dashboard?subscription=checkout-error#suscripcion" as Route);
  const url = await createCheckoutRedirectUrl(supabase, { ...input.data, profileId: profile.id });
  if (!url) redirect(`/dashboard/suscripcion/pagar?subscriptionId=${input.data.subscriptionId}&error=checkout` as Route);
  redirect(url as Route);
}
