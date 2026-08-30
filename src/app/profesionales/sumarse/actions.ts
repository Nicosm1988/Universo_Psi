"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/dal/auth";
import { createCheckoutRedirectUrl } from "@/lib/subscriptions/checkout";
import { createClient } from "@/lib/supabase/server";
import {
  onboardingSchema,
  onboardingSubmissionSchema,
  type OnboardingState,
} from "@/lib/validation/onboarding";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function values(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .flatMap((entry) => (typeof entry === "string" ? [entry] : []));
}

function slugPart(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

export async function saveOnboardingAction(
  previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const intent = value(formData, "intent");
  if (intent === "submit") {
    const submission = onboardingSubmissionSchema.safeParse({
      profileId: value(formData, "profileId") || previousState.profileId,
      planCode: value(formData, "planCode"),
      intent,
    });

    if (!submission.success) {
      return {
        status: "error",
        message: "Guardá el perfil y elegí un plan antes de enviarlo.",
        profileId: previousState.profileId,
        errors: submission.error.flatten().fieldErrors,
      };
    }

    const user = await requireCurrentUser("/profesionales/sumarse");
    const supabase = await createClient();
    const { data: subscriptionId, error: planError } = await supabase.rpc(
      "select_professional_plan",
      {
        p_profile_id: submission.data.profileId,
        p_plan_code: submission.data.planCode,
      },
    );
    if (planError) {
      return {
        status: "error",
        message: "No pudimos registrar el plan elegido.",
        profileId: submission.data.profileId,
      };
    }

    const { error } = await supabase.rpc("submit_professional_profile", {
      p_profile_id: submission.data.profileId,
    });
    if (error) {
      return {
        status: "error",
        message:
          "El borrador está guardado, pero todavía faltan datos o documentación para enviarlo a revisión.",
        profileId: submission.data.profileId,
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/profesionales/sumarse");

    const redirectUrl = subscriptionId
      ? await createCheckoutRedirectUrl(supabase, {
          subscriptionId,
          profileId: submission.data.profileId,
          email: user.email,
        })
      : null;
    if (redirectUrl) {
      redirect(redirectUrl as Route);
    }

    return {
      status: "submitted",
      message:
        "Perfil enviado. El equipo revisará tu identidad y documentación. Te avisaremos cuando el cobro en línea esté habilitado.",
      profileId: submission.data.profileId,
    };
  }

  const parsed = onboardingSchema.safeParse({
    profileId: value(formData, "profileId") || previousState.profileId || undefined,
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
    headline: value(formData, "headline"),
    bio: value(formData, "bio"),
    approach: value(formData, "approach"),
    experienceSummary: value(formData, "experienceSummary"),
    educationSummary: value(formData, "educationSummary"),
    yearsExperience: value(formData, "yearsExperience"),
    availabilityStatus: value(formData, "availabilityStatus"),
    linkedinUrl: value(formData, "linkedinUrl"),
    websiteUrl: value(formData, "websiteUrl"),
    professionalTypeId: value(formData, "professionalTypeId"),
    needIds: values(formData, "needIds"),
    serviceIds: values(formData, "serviceIds"),
    modalityIds: values(formData, "modalityIds"),
    languageIds: values(formData, "languageIds"),
    planCode: value(formData, "planCode"),
    intent: value(formData, "intent"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados antes de continuar.",
      profileId: previousState.profileId,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await requireCurrentUser("/profesionales/sumarse");
  const userId = user.id;
  const supabase = await createClient();

  const { data: supportedType, error: supportedTypeError } = await supabase
    .from("professional_types")
    .select("id")
    .eq("id", parsed.data.professionalTypeId)
    .eq("is_active", true)
    .maybeSingle();

  if (supportedTypeError || !supportedType) {
    return {
      status: "error",
      message: "Elegí un tipo de profesional válido para continuar.",
      profileId: previousState.profileId,
      errors: {
        professionalTypeId: [
          "Universo Psi publica únicamente perfiles de tipos de profesional activos.",
        ],
      },
    };
  }

  const profilePayload = {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    headline: parsed.data.headline,
    bio: parsed.data.bio,
    approach: parsed.data.approach || null,
    experience_summary: parsed.data.experienceSummary || null,
    education_summary: parsed.data.educationSummary || null,
    years_experience: parsed.data.yearsExperience,
    availability_status: parsed.data.availabilityStatus,
    linkedin_url: parsed.data.linkedinUrl ?? null,
    website_url: parsed.data.websiteUrl ?? null,
  };

  let profileId = parsed.data.profileId;
  if (profileId) {
    const { data, error } = await supabase
      .from("professional_profiles")
      .update(profilePayload)
      .eq("id", profileId)
      .select("id")
      .single();
    if (error || !data) {
      return { status: "error", message: "No pudimos guardar el perfil." };
    }
    profileId = data.id;
  } else {
    const slug = `${slugPart(`${parsed.data.firstName}-${parsed.data.lastName}`) || "profesional"}-${userId.slice(0, 8)}`;
    const { data, error } = await supabase
      .from("professional_profiles")
      .insert({ ...profilePayload, user_id: userId, slug })
      .select("id")
      .single();
    if (error || !data) {
      return { status: "error", message: "No pudimos crear el perfil." };
    }
    profileId = data.id;
  }

  const relationWrites = [
    supabase
      .from("professional_profile_types")
      .delete()
      .eq("professional_profile_id", profileId),
    supabase
      .from("professional_needs")
      .delete()
      .eq("professional_profile_id", profileId),
    supabase
      .from("professional_services")
      .delete()
      .eq("professional_profile_id", profileId),
    supabase
      .from("professional_modalities")
      .delete()
      .eq("professional_profile_id", profileId),
    supabase
      .from("professional_languages")
      .delete()
      .eq("professional_profile_id", profileId),
  ];
  const deleteResults = await Promise.all(relationWrites);
  if (deleteResults.some(({ error }) => error)) {
    return {
      status: "error",
      message: "El perfil se guardó, pero no pudimos actualizar sus categorías.",
      profileId,
    };
  }

  const insertResults = await Promise.all([
    supabase.from("professional_profile_types").insert({
      professional_profile_id: profileId,
      professional_type_id: parsed.data.professionalTypeId,
      is_primary: true,
    }),
    supabase.from("professional_needs").insert(
      parsed.data.needIds.map((needId) => ({
        professional_profile_id: profileId,
        need_id: needId,
      })),
    ),
    supabase.from("professional_services").insert(
      parsed.data.serviceIds.map((serviceId) => ({
        professional_profile_id: profileId,
        service_id: serviceId,
      })),
    ),
    supabase.from("professional_modalities").insert(
      parsed.data.modalityIds.map((modalityId) => ({
        professional_profile_id: profileId,
        modality_id: modalityId,
      })),
    ),
    supabase.from("professional_languages").insert(
      parsed.data.languageIds.map((languageId) => ({
        professional_profile_id: profileId,
        language_id: languageId,
        proficiency: "PROFESSIONAL",
      })),
    ),
  ]);
  if (insertResults.some(({ error }) => error)) {
    return {
      status: "error",
      message: "El borrador quedó guardado, pero faltan categorías por asociar.",
      profileId,
    };
  }

  const { error: planError } = await supabase.rpc("select_professional_plan", {
    p_profile_id: profileId,
    p_plan_code: parsed.data.planCode,
  });
  if (planError) {
    return {
      status: "error",
      message: "El perfil quedó guardado, pero no pudimos registrar el plan.",
      profileId,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profesionales/sumarse");

  return {
    status: "saved",
    message: "Borrador guardado. Ya podés adjuntar tu documentación.",
    profileId,
  };
}
