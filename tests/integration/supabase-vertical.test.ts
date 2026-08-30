import { createHash } from "node:crypto";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const TEST_SUITE = "supabase_vertical";
const PROFESSIONAL_EMAIL = "integration.professional@universo-psi.test";
const ADMIN_EMAIL = "integration.admin@universo-psi.test";
const OUTSIDER_EMAIL = "integration.outsider@universo-psi.test";
const TEST_EMAILS = new Set([
  PROFESSIONAL_EMAIL,
  ADMIN_EMAIL,
  OUTSIDER_EMAIL,
]);
const PASSWORD = "UniversoPsi-Integration-2026!";
const PROFILE_SLUG = "integration-supabase-professional";
const CREDENTIAL_FILE_NAME = "integration-credential.pdf";
const LEGAL_VERSION = "2026-08";

const testEnv = {
  url: process.env.SUPABASE_TEST_URL?.trim() ?? "",
  publishableKey:
    process.env.SUPABASE_TEST_PUBLISHABLE_KEY?.trim() ?? "",
  secretKey: process.env.SUPABASE_TEST_SECRET_KEY?.trim() ?? "",
};

const missingEnv = [
  ["SUPABASE_TEST_URL", testEnv.url],
  ["SUPABASE_TEST_PUBLISHABLE_KEY", testEnv.publishableKey],
  ["SUPABASE_TEST_SECRET_KEY", testEnv.secretKey],
] as const;
const missingEnvNames = missingEnv
  .filter(([, value]) => value.length === 0)
  .map(([name]) => name);
const describeIntegration =
  missingEnvNames.length > 0 ? describe.skip : describe;

type ErrorLike = {
  code?: string;
  message: string;
};

type ResultLike<T> = {
  data: T | null;
  error: ErrorLike | null;
};

type IdRow = {
  id: string;
};

type ProfileRow = IdRow & {
  publication_status: string;
  slug: string;
};

type RankedProfileRow = {
  professional_profile_id: string;
};

type CredentialStatusRow = {
  credential_id: string;
  verification_status: string;
};

type LeadRow = {
  email: string;
  lead_id: string;
  message: string;
  status: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertNoError(
  result: { error: ErrorLike | null },
  operation: string,
) {
  if (result.error) {
    const code = result.error.code ? ` [${result.error.code}]` : "";
    throw new Error(`${operation}${code}: ${result.error.message}`);
  }
}

function requireData<T>(result: ResultLike<T>, operation: string): T {
  assertNoError(result, operation);
  if (result.data === null) {
    throw new Error(`${operation}: la respuesta no incluyó datos`);
  }
  return result.data;
}

function makeClient(key: string) {
  return createClient(testEnv.url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function assertLocalUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new Error(
      "La integración destructiva sólo admite un SUPABASE_TEST_URL local por HTTP.",
    );
  }
}

async function createConfirmedUser(
  backend: SupabaseClient,
  email: string,
): Promise<User> {
  const result = await backend.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Integración Universo Psi" },
  });

  assertNoError(result, `Crear usuario confirmado ${email}`);
  if (!result.data.user) {
    throw new Error(`Crear usuario confirmado ${email}: usuario ausente`);
  }
  return result.data.user;
}

async function signIn(
  email: string,
  expectedUserId: string,
): Promise<SupabaseClient> {
  const client = makeClient(testEnv.publishableKey);
  const result = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });

  assertNoError(result, `Iniciar sesión ${email}`);
  expect(result.data.user?.id).toBe(expectedUserId);
  return client;
}

async function activeCatalogId(
  backend: SupabaseClient,
  table: string,
  code: string,
) {
  const result = await backend
    .from(table)
    .select("id")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  return (requireData(result, `Resolver ${table}.${code}`) as IdRow).id;
}

async function cleanupTestData(backend: SupabaseClient) {
  const analyticsDelete = await backend
    .from("analytics_events")
    .delete()
    .contains("properties", { test_suite: TEST_SUITE });
  assertNoError(analyticsDelete, "Limpiar eventos analíticos de integración");

  const profilesResult = await backend
    .from("professional_profiles")
    .select("id")
    .eq("slug", PROFILE_SLUG);
  const profiles = requireData(
    profilesResult,
    "Buscar perfiles anteriores de integración",
  ) as IdRow[];

  for (const profile of profiles) {
    const reviewDelete = await backend
      .from("reviews")
      .delete()
      .eq("professional_profile_id", profile.id);
    assertNoError(reviewDelete, "Limpiar reseñas de integración");

    const leadDelete = await backend
      .from("leads")
      .delete()
      .eq("professional_profile_id", profile.id);
    assertNoError(leadDelete, "Limpiar leads de integración");

    const subscriptionDelete = await backend
      .from("subscriptions")
      .delete()
      .eq("professional_profile_id", profile.id);
    assertNoError(subscriptionDelete, "Limpiar suscripciones de integración");

    const profileDelete = await backend
      .from("professional_profiles")
      .delete()
      .eq("id", profile.id);
    assertNoError(profileDelete, "Limpiar perfil profesional de integración");
  }

  const usersResult = await backend.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  assertNoError(usersResult, "Listar usuarios para limpieza de integración");

  const testUsers = usersResult.data.users.filter(
    (user) => user.email && TEST_EMAILS.has(user.email),
  );

  for (const user of testUsers) {
    const credentialPath = `${user.id}/${CREDENTIAL_FILE_NAME}`;
    const objectDelete = await backend.storage
      .from("professional-credentials")
      .remove([credentialPath]);
    assertNoError(objectDelete, "Limpiar objeto de credencial de integración");

    const userDelete = await backend.auth.admin.deleteUser(user.id);
    assertNoError(userDelete, `Eliminar usuario de integración ${user.email}`);
  }
}

async function assertNoExistingSuperadmin(backend: SupabaseClient) {
  const roleResult = await backend
    .from("roles")
    .select("id")
    .eq("code", "SUPERADMIN")
    .single();
  const roleId = (requireData(
    roleResult,
    "Resolver rol SUPERADMIN",
  ) as IdRow).id;
  const assignmentsResult = await backend
    .from("user_roles")
    .select("user_id")
    .eq("role_id", roleId);
  const assignments = requireData(
    assignmentsResult,
    "Verificar bootstrap SUPERADMIN",
  ) as Array<{ user_id: string }>;

  if (assignments.length > 0) {
    throw new Error(
      "La base local ya tiene un SUPERADMIN ajeno al fixture. Ejecutá `npm run db:reset` antes de esta integración.",
    );
  }
}

describeIntegration(
  missingEnvNames.length > 0
    ? `vertical Supabase local (omitido: faltan ${missingEnvNames.join(", ")})`
    : "vertical Supabase local",
  () => {
    it("recorre onboarding, verificación, publicación, suscripción, lead y analítica con RLS", async () => {
      assertLocalUrl(testEnv.url);
      const backend = makeClient(testEnv.secretKey);

      await cleanupTestData(backend);

      try {
        await assertNoExistingSuperadmin(backend);

        const [professionalUser, adminUser, outsiderUser] = await Promise.all([
          createConfirmedUser(backend, PROFESSIONAL_EMAIL),
          createConfirmedUser(backend, ADMIN_EMAIL),
          createConfirmedUser(backend, OUTSIDER_EMAIL),
        ]);

        for (const user of [professionalUser, adminUser, outsiderUser]) {
          const acceptance = await backend.rpc(
            "accept_terms_from_signup_backend",
            {
              p_terms_version: LEGAL_VERSION,
              p_user_id: user.id,
            },
          );
          assertNoError(acceptance, `Aceptar términos para ${user.email}`);
        }

        const bootstrap = await backend.rpc(
          "bootstrap_first_superadmin_from_backend",
          { p_user_id: adminUser.id },
        );
        assertNoError(bootstrap, "Crear primer SUPERADMIN local");

        const [professional, admin, outsider] = await Promise.all([
          signIn(PROFESSIONAL_EMAIL, professionalUser.id),
          signIn(ADMIN_EMAIL, adminUser.id),
          signIn(OUTSIDER_EMAIL, outsiderUser.id),
        ]);
        const anonymous = makeClient(testEnv.publishableKey);

        const [
          professionalTypeId,
          credentialTypeId,
          needId,
          serviceId,
          modalityId,
          languageId,
        ] = await Promise.all([
          activeCatalogId(backend, "professional_types", "psychopedagogy"),
          activeCatalogId(
            backend,
            "credential_types",
            "university_degree",
          ),
          activeCatalogId(backend, "needs", "job_change"),
          activeCatalogId(backend, "services", "career_strategy"),
          activeCatalogId(backend, "modalities", "ONLINE"),
          activeCatalogId(backend, "languages", "es"),
        ]);

        const publicProfessionalTypes = await anonymous
          .from("professional_types")
          .select("code")
          .order("sort_order");
        assertNoError(
          publicProfessionalTypes,
          "Leer tipos profesionales públicos",
        );
        expect(
          (publicProfessionalTypes.data ?? []).map(({ code }) => code),
        ).toEqual(["psychology_orientation", "psychopedagogy"]);

        const profileResult = await professional
          .from("professional_profiles")
          .insert({
            user_id: professionalUser.id,
            slug: PROFILE_SLUG,
            first_name: "Prueba",
            last_name: "Integración",
            headline: "Psicopedagogía para decisiones educativas y profesionales",
            bio: "Perfil ficticio creado exclusivamente por la prueba de integración local de Universo Psi.",
            approach:
              "Acompañamiento práctico con objetivos, hipótesis y próximos pasos verificables.",
            experience_summary:
              "Experiencia ficticia utilizada únicamente para validar el vertical.",
            education_summary:
              "Formación ficticia utilizada únicamente para validar el vertical.",
            years_experience: 8,
            availability_status: "AVAILABLE",
            is_accepting_leads: true,
          })
          .select("id, slug, publication_status")
          .single();
        const profile = requireData(
          profileResult,
          "Crear perfil profesional propio",
        ) as ProfileRow;
        expect(profile.publication_status).toBe("DRAFT");

        for (const client of [anonymous, outsider]) {
          const hiddenDraft = await client
            .from("professional_profiles")
            .select("id")
            .eq("id", profile.id);
          assertNoError(hiddenDraft, "Consultar borrador desde otro actor");
          expect(hiddenDraft.data).toEqual([]);
        }

        const hiddenFromAnonymousSearch = await anonymous.rpc(
          "rank_professionals",
          { p_search: "integracion" },
        );
        assertNoError(
          hiddenFromAnonymousSearch,
          "Buscar un perfil todavía no publicado",
        );
        expect(
          ((hiddenFromAnonymousSearch.data ?? []) as RankedProfileRow[]).some(
            (row) => row.professional_profile_id === profile.id,
          ),
        ).toBe(false);

        const forbiddenSubmission = await outsider.rpc(
          "submit_professional_profile",
          { p_profile_id: profile.id },
        );
        expect(forbiddenSubmission.error?.code).toBe("42501");

        const relations = await Promise.all([
          professional.from("professional_profile_types").insert({
            professional_profile_id: profile.id,
            professional_type_id: professionalTypeId,
            is_primary: true,
          }),
          professional.from("professional_needs").insert({
            professional_profile_id: profile.id,
            need_id: needId,
          }),
          professional.from("professional_services").insert({
            professional_profile_id: profile.id,
            service_id: serviceId,
            title: "Estrategia de carrera de integración",
            description: "Servicio ficticio para la prueba local.",
            is_active: true,
          }),
          professional.from("professional_modalities").insert({
            professional_profile_id: profile.id,
            modality_id: modalityId,
          }),
          professional.from("professional_languages").insert({
            professional_profile_id: profile.id,
            language_id: languageId,
            proficiency: "NATIVE",
          }),
        ]);
        relations.forEach((result, index) =>
          assertNoError(result, `Crear relación mínima ${index + 1}`),
        );

        const planSelection = await professional.rpc(
          "select_professional_plan",
          {
            p_plan_code: "BASE",
            p_profile_id: profile.id,
          },
        );
        const subscriptionId = requireData(
          planSelection,
          "Seleccionar plan BASE",
        ) as string;
        const subscription = await professional
          .from("subscriptions")
          .select("id, status, leads_used_in_period")
          .eq("id", subscriptionId)
          .single();
        const subscriptionRow = requireData(
          subscription,
          "Leer suscripción propia",
        ) as {
          id: string;
          leads_used_in_period: number;
          status: string;
        };
        expect(subscriptionRow.status).toBe("PENDING_PAYMENT");

        const objectPath = `${professionalUser.id}/${CREDENTIAL_FILE_NAME}`;
        const credentialDocument = new Blob(
          ["%PDF-1.4\n% Universo Psi integration fixture\n%%EOF\n"],
          { type: "application/pdf" },
        );
        const upload = await professional.storage
          .from("professional-credentials")
          .upload(objectPath, credentialDocument, {
            contentType: "application/pdf",
            upsert: false,
          });
        assertNoError(upload, "Subir credencial privada propia");

        const forbiddenCredential = await outsider.storage
          .from("professional-credentials")
          .download(objectPath);
        expect(forbiddenCredential.data).toBeNull();
        expect(forbiddenCredential.error).not.toBeNull();

        const credentialSubmission = await professional.rpc(
          "submit_professional_credential",
          {
            p_credential_type_id: credentialTypeId,
            p_expires_on: null,
            p_issued_on: "2026-01-15",
            p_issuing_entity: "Institución ficticia de integración",
            p_jurisdiction: null,
            p_object_path: objectPath,
            p_profile_id: profile.id,
            p_registration_number: null,
            p_title: "Título ficticio de Psicopedagogía",
          },
        );
        const credentialId = requireData(
          credentialSubmission,
          "Presentar credencial profesional",
        ) as string;

        const credentialStatuses = await professional.rpc(
          "my_credential_statuses",
        );
        const pendingCredential = (
          requireData(
            credentialStatuses,
            "Leer credenciales propias",
          ) as CredentialStatusRow[]
        ).find((row) => row.credential_id === credentialId);
        expect(pendingCredential?.verification_status).toBe("PENDING");

        const profileSubmission = await professional.rpc(
          "submit_professional_profile",
          { p_profile_id: profile.id },
        );
        assertNoError(profileSubmission, "Enviar perfil a revisión");

        const submittedProfile = await professional
          .from("professional_profiles")
          .select("publication_status")
          .eq("id", profile.id)
          .single();
        expect(
          requireData(
            submittedProfile,
            "Confirmar estado del perfil enviado",
          ),
        ).toMatchObject({ publication_status: "PENDING_REVIEW" });

        const pendingProfiles = await admin.rpc(
          "admin_pending_professional_profiles",
          { p_limit: 20 },
        );
        expect(
          (
            requireData(
              pendingProfiles,
              "Listar perfiles pendientes como admin",
            ) as IdRow[]
          ).some((row) => row.id === profile.id),
        ).toBe(true);

        const pendingCredentials = await admin.rpc(
          "admin_pending_credentials",
          { p_before: null, p_limit: 20 },
        );
        expect(
          (
            requireData(
              pendingCredentials,
              "Listar credenciales pendientes como admin",
            ) as Array<{ credential_id: string }>
          ).some((row) => row.credential_id === credentialId),
        ).toBe(true);

        const adminCredentialRead = await admin.storage
          .from("professional-credentials")
          .download(objectPath);
        assertNoError(adminCredentialRead, "Leer credencial privada como admin");
        expect(adminCredentialRead.data?.size).toBeGreaterThan(0);

        const resolution = await admin.rpc("admin_resolve_credential", {
          p_credential_id: credentialId,
          p_internal_notes: "Validación automática de integración local.",
          p_status: "APPROVED",
          p_valid_until: null,
        });
        assertNoError(resolution, "Aprobar credencial como admin");

        const publication = await admin.rpc(
          "admin_set_professional_publication",
          {
            p_profile_id: profile.id,
            p_reason: null,
            p_status: "PUBLISHED",
          },
        );
        assertNoError(publication, "Publicar perfil como admin");

        const publicProfile = await anonymous
          .from("professional_directory")
          .select(
            "id, slug, verification_state, professional_type_ids, need_ids, service_ids, modality_ids, language_ids",
          )
          .eq("id", profile.id)
          .single();
        const directoryRow = requireData(
          publicProfile,
          "Leer perfil publicado desde el directorio anónimo",
        ) as {
          id: string;
          language_ids: string[];
          modality_ids: string[];
          need_ids: string[];
          professional_type_ids: string[];
          service_ids: string[];
          slug: string;
          verification_state: string;
        };
        expect(directoryRow).toMatchObject({
          id: profile.id,
          slug: PROFILE_SLUG,
          verification_state: "VERIFIED",
        });
        expect(directoryRow.professional_type_ids).toContain(professionalTypeId);
        expect(directoryRow.need_ids).toContain(needId);
        expect(directoryRow.service_ids).toContain(serviceId);
        expect(directoryRow.modality_ids).toContain(modalityId);
        expect(directoryRow.language_ids).toContain(languageId);

        const completePublicProfile = await anonymous
          .from("professional_directory")
          .select("*")
          .eq("id", profile.id)
          .single();
        const completeDirectoryRow = requireData(
          completePublicProfile,
          "Leer contrato público completo sin precios",
        ) as Record<string, unknown>;
        expect(completeDirectoryRow).not.toHaveProperty("starting_price");
        expect(completeDirectoryRow).not.toHaveProperty("currency");
        expect(completeDirectoryRow).not.toHaveProperty("show_starting_price");

        const forbiddenPublicPrice = await anonymous
          .from("professional_profiles")
          .select("starting_price")
          .eq("id", profile.id);
        expect(forbiddenPublicPrice.error).not.toBeNull();

        const searchResults: string[][] = [];
        for (const query of ["Integración", "integracion"]) {
          const search = await anonymous.rpc("rank_professionals", {
            p_search: query,
          });
          assertNoError(search, `Buscar perfil publicado con ${query}`);
          const resultIds = ((search.data ?? []) as RankedProfileRow[]).map(
            (row) => row.professional_profile_id,
          );
          expect(resultIds).toContain(profile.id);
          const rankedProfile = (
            (search.data ?? []) as Array<Record<string, unknown>>
          ).find((row) => row.professional_profile_id === profile.id);
          expect(rankedProfile).not.toHaveProperty("starting_price");
          expect(rankedProfile).not.toHaveProperty("currency");
          searchResults.push(resultIds.toSorted());
        }
        expect(searchResults[1]).toEqual(searchResults[0]);

        const idempotencyHash = sha256(
          `${TEST_SUITE}:${profile.id}:lead-idempotency`,
        );
        const fingerprintHash = sha256(`${TEST_SUITE}:fingerprint`);
        const leadArgs = {
          p_campaign: null,
          p_consented_at: new Date().toISOString(),
          p_consent_version: LEGAL_VERSION,
          p_consumer_user_id: null,
          p_contact_preference: "EMAIL",
          p_email: "persona.consumidora@example.test",
          p_fingerprint_hash: fingerprintHash,
          p_full_name: "Persona Consumidora",
          p_idempotency_key_hash: idempotencyHash,
          p_landing_path: `/profesionales/${PROFILE_SLUG}`,
          p_message:
            "Consulta ficticia creada por la prueba de integración local.",
          p_need_id: needId,
          p_phone: null,
          p_plan_code_snapshot: "BASE",
          p_professional_profile_id: profile.id,
          p_source: "integration_test",
          p_utm_campaign: null,
          p_utm_medium: null,
          p_utm_source: null,
        };

        const forbiddenLead = await anonymous.rpc(
          "create_lead_from_backend",
          leadArgs,
        );
        expect(forbiddenLead.error).not.toBeNull();

        const leadCreation = await backend.rpc(
          "create_lead_from_backend",
          leadArgs,
        );
        const leadId = requireData(
          leadCreation,
          "Crear lead por RPC de backend",
        ) as string;
        const idempotentReplay = await backend.rpc(
          "create_lead_from_backend",
          leadArgs,
        );
        expect(
          requireData(idempotentReplay, "Repetir lead de forma idempotente"),
        ).toBe(leadId);

        const professionalLeads = await professional.rpc(
          "my_professional_leads",
          { p_before: null, p_limit: 20, p_profile_id: profile.id },
        );
        const lead = (
          requireData(
            professionalLeads,
            "Leer leads propios con PII",
          ) as LeadRow[]
        ).find((row) => row.lead_id === leadId);
        expect(lead).toMatchObject({
          email: "persona.consumidora@example.test",
          lead_id: leadId,
          message: "Consulta ficticia creada por la prueba de integración local.",
          status: "NEW",
        });

        const outsiderLeads = await outsider.rpc("my_professional_leads", {
          p_before: null,
          p_limit: 20,
          p_profile_id: profile.id,
        });
        assertNoError(outsiderLeads, "Consultar leads como no propietario");
        expect(outsiderLeads.data).toEqual([]);

        const forbiddenLeadUpdate = await outsider.rpc(
          "update_professional_lead_status",
          { p_lead_id: leadId, p_new_status: "VIEWED" },
        );
        expect(forbiddenLeadUpdate.error?.code).toBe("42501");

        const leadUpdate = await professional.rpc(
          "update_professional_lead_status",
          { p_lead_id: leadId, p_new_status: "VIEWED" },
        );
        assertNoError(leadUpdate, "Actualizar estado del lead propio");

        const analytics = await backend.rpc(
          "record_analytics_event_from_backend",
          {
            p_agreement_id: null,
            p_anonymous_id_hash: sha256(`${TEST_SUITE}:anonymous`),
            p_article_id: null,
            p_event_name: "professional_profile_viewed",
            p_occurred_at: new Date().toISOString(),
            p_path: `/profesionales/${PROFILE_SLUG}`,
            p_professional_profile_id: profile.id,
            p_properties: { source: "integration_test", test_suite: TEST_SUITE },
            p_session_id: sha256(`${TEST_SUITE}:session`),
            p_user_id: null,
          },
        );
        const analyticsId = requireData(
          analytics,
          "Registrar evento analítico por backend",
        );
        expect(Number.isInteger(Number(analyticsId))).toBe(true);

        const metrics = await professional
          .from("professional_metrics_daily")
          .select("leads, profile_views")
          .eq("professional_profile_id", profile.id)
          .single();
        expect(requireData(metrics, "Leer métricas profesionales propias")).toMatchObject(
          { leads: 1, profile_views: 1 },
        );

        const updatedSubscription = await professional
          .from("subscriptions")
          .select("leads_used_in_period")
          .eq("id", subscriptionId)
          .single();
        expect(
          requireData(
            updatedSubscription,
            "Leer consumo de suscripción actualizado",
          ),
        ).toMatchObject({ leads_used_in_period: 1 });
      } finally {
        await cleanupTestData(backend);
      }
    });
  },
);
