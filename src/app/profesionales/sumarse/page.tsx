import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfessionalOnboardingForm } from "@/components/onboarding/professional-onboarding-form";
import { requireCurrentUser } from "@/lib/dal/auth";
import type { MyProfessionalProfile } from "@/lib/supabase/contracts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crear perfil profesional | Universo Psi",
  description: "Completá y verificá tu perfil profesional en Universo Psi.",
  robots: { index: false, follow: false },
};

export default async function ProfessionalOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  await requireCurrentUser("/profesionales/sumarse");

  const supabase = await createClient();
  const requestedPlan = (await searchParams).plan?.toUpperCase();
  const initialPlan =
    requestedPlan === "BASE" ||
    requestedPlan === "IMPULSO" ||
    requestedPlan === "REFERENTE"
      ? requestedPlan
      : undefined;
  const [typesResult, needsResult, servicesResult, modalitiesResult, languagesResult, plansResult, credentialTypesResult, credentialsResult, profileResult] =
    await Promise.all([
      supabase
        .from("professional_types")
        .select("id,name,description")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("needs").select("id,name,short_description").eq("is_active", true).order("sort_order"),
      supabase.from("services").select("id,name,description").eq("is_active", true).order("sort_order"),
      supabase.from("modalities").select("id,name").eq("is_active", true).order("sort_order"),
      supabase.from("languages").select("id,name").eq("is_active", true).order("sort_order"),
      supabase.from("plans").select("code,name,description").eq("is_active", true).order("sort_order"),
      supabase.from("credential_types").select("id,name").eq("is_active", true).order("sort_order"),
      supabase.rpc("my_credential_statuses"),
      supabase.rpc("my_professional_profile").maybeSingle(),
    ]);

  const profile = profileResult.data as MyProfessionalProfile | null;
  let relations = {
    professionalTypeId: undefined as string | undefined,
    needIds: [] as string[],
    serviceIds: [] as string[],
    modalityIds: [] as string[],
    languageIds: [] as string[],
    planCode: undefined as "BASE" | "IMPULSO" | "REFERENTE" | undefined,
  };

  if (profile) {
    const [typeLinks, needLinks, serviceLinks, modalityLinks, languageLinks, subscription] = await Promise.all([
      supabase.from("professional_profile_types").select("professional_type_id").eq("professional_profile_id", profile.id).eq("is_primary", true),
      supabase.from("professional_needs").select("need_id").eq("professional_profile_id", profile.id),
      supabase.from("professional_services").select("service_id").eq("professional_profile_id", profile.id),
      supabase.from("professional_modalities").select("modality_id").eq("professional_profile_id", profile.id),
      supabase.from("professional_languages").select("language_id").eq("professional_profile_id", profile.id),
      supabase
        .from("subscriptions")
        .select("plans(code)")
        .eq("professional_profile_id", profile.id)
        .in("status", ["PENDING_PAYMENT", "TRIALING", "ACTIVE"])
        .maybeSingle(),
    ]);
    const planRelation = subscription.data?.plans as
      | { code?: string }
      | { code?: string }[]
      | null
      | undefined;
    const currentPlanCode = Array.isArray(planRelation)
      ? planRelation[0]?.code
      : planRelation?.code;
    relations = {
      professionalTypeId: typeLinks.data?.[0]?.professional_type_id,
      needIds: (needLinks.data ?? []).map((item) => item.need_id),
      serviceIds: (serviceLinks.data ?? []).map((item) => item.service_id),
      modalityIds: (modalityLinks.data ?? []).map((item) => item.modality_id),
      languageIds: (languageLinks.data ?? []).map((item) => item.language_id),
      planCode:
        currentPlanCode === "BASE" ||
        currentPlanCode === "IMPULSO" ||
        currentPlanCode === "REFERENTE"
          ? currentPlanCode
          : undefined,
    };
  }

  const existing = profile
    ? {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        headline: profile.headline,
        bio: profile.bio,
        approach: profile.approach ?? "",
        experienceSummary: profile.experience_summary ?? "",
        educationSummary: profile.education_summary ?? "",
        yearsExperience: profile.years_experience,
        availabilityStatus: profile.availability_status,
        linkedinUrl: profile.linkedin_url ?? "",
        websiteUrl: profile.website_url ?? "",
        updatedAt: profile.updated_at,
        ...relations,
      }
    : null;

  return (
    <main id="contenido" className="bg-paper py-12 sm:py-20">
      <Container className="max-w-4xl">
        <div className="mb-5 flex justify-end">
          <ThemeToggle />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Perfil profesional</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
          Tu recorrido merece una presentación a la altura.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Podés guardar un borrador y volver cuando quieras. Nada se publica antes de la revisión.
        </p>
        <ProfessionalOnboardingForm
          professionalTypes={typesResult.data ?? []}
          needs={(needsResult.data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.short_description }))}
          services={servicesResult.data ?? []}
          modalities={modalitiesResult.data ?? []}
          languages={languagesResult.data ?? []}
          plans={(plansResult.data ?? []).flatMap((plan) =>
            plan.code === "BASE" || plan.code === "IMPULSO" || plan.code === "REFERENTE"
              ? [{ ...plan, code: plan.code }]
              : [],
          )}
          credentialTypes={credentialTypesResult.data ?? []}
          initialCredentials={(credentialsResult.data ?? []).map((item: {
            credential_id: string;
            title: string;
            verification_status: string;
            submitted_at: string;
          }) => ({
            credential_id: item.credential_id,
            title: item.title,
            verification_status: item.verification_status,
            submitted_at: item.submitted_at,
          }))}
          initialPlan={initialPlan ?? relations.planCode ?? "BASE"}
          existing={existing}
        />
      </Container>
    </main>
  );
}
