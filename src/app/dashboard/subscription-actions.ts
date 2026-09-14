"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCurrentUser } from "@/lib/dal/auth";
import { createHostedCheckoutRedirectUrl as createCheckoutRedirectUrl } from "@/lib/subscriptions/checkout";
import { checkoutFailure } from "@/lib/subscriptions/checkout-diagnostics";
import { createClient } from "@/lib/supabase/server";

export async function retrySubscriptionCheckoutAction(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("subscriptionId"));
  if (!id.success) {
    checkoutFailure("action_input", "invalid_input");
    redirect("/dashboard?subscription=checkout-error#suscripcion" as Route);
  }
  await requireCurrentUser("/dashboard");
  const supabase = await createClient();
  // The owner RPC derives identity from auth.uid(); user_id is intentionally
  // unavailable to authenticated table reads, including WHERE predicates.
  const { data: profile, error } = await supabase.rpc("my_professional_profile")
    .select("id").maybeSingle();
  if (error || !profile) {
    checkoutFailure("action_profile", error ? "database_error" : "missing_profile", error);
    redirect("/dashboard?subscription=checkout-error#suscripcion" as Route);
  }
  const checkout = await createCheckoutRedirectUrl(supabase, { subscriptionId: id.data, profileId: profile.id });
  if (!checkout) redirect("/dashboard?subscription=checkout-error#suscripcion" as Route);
  redirect(checkout as Route);
}
