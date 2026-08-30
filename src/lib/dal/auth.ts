import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import { safeInternalPath } from "@/lib/http/origin";
import { TERMS_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  hasAcceptedCurrentTerms: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;

  if (claimsError || typeof subject !== "string") return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("display_name,terms_version")
      .eq("id", subject)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("user_id", subject),
  ]);

  const roles = (memberships ?? []).flatMap((membership) => {
    const role = membership.roles as { code?: unknown } | { code?: unknown }[] | null;
    if (Array.isArray(role)) {
      return role.flatMap((item) =>
        typeof item.code === "string" ? [item.code] : [],
      );
    }
    return typeof role?.code === "string" ? [role.code] : [];
  });

  return {
    id: subject,
    email:
      typeof claimsData?.claims?.email === "string"
        ? claimsData.claims.email
        : null,
    displayName:
      profile && typeof profile.display_name === "string"
        ? profile.display_name
        : null,
    roles,
    hasAcceptedCurrentTerms: profile?.terms_version === TERMS_VERSION,
  };
});

export async function requireCurrentUser(nextPath: string) {
  const next = safeInternalPath(nextPath);
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}` as Route);
  if (!user.hasAcceptedCurrentTerms) {
    redirect(`/aceptar-terminos?next=${encodeURIComponent(next)}` as Route);
  }
  return user;
}

export async function hasRole(roleCodes: readonly string[]) {
  const user = await getCurrentUser();
  return Boolean(user && user.roles.some((role) => roleCodes.includes(role)));
}
