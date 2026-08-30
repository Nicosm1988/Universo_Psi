import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export const AUTH_E2E = {
  professionalEmail: "e2e.auth.professional@universo-psi.test",
  adminEmail: "e2e.auth.admin@universo-psi.test",
  password: "UniversoPsi-E2E-2026!",
  professionalFirstName: "Nadia",
  professionalLastName: "Navegador E2E",
  professionalFullName: "Nadia Navegador E2E",
  credentialTitle: "Certificación ficticia de navegador",
  legalVersion: "2026-08",
} as const;

const TEST_EMAILS = new Set<string>([
  AUTH_E2E.professionalEmail,
  AUTH_E2E.adminEmail,
]);
const PROFILE_SLUG_PREFIX = "nadia-navegador-e2e-";

type ErrorLike = {
  code?: string;
  message: string;
};

type IdRow = {
  id: string | number;
};

type ProfileIdRow = {
  id: string;
};

type ProfileRow = ProfileIdRow & {
  publication_status: string;
  slug: string;
  verification_state: string;
};

export type LocalAuthE2EEnvironment = {
  publishableKey: string;
  secretKey: string;
  supabaseUrl: string;
};

export type AuthE2EProfileSummary = {
  planCode: string | null;
  publicationStatus: string;
  slug: string;
  subscriptionStatus: string | null;
  verificationState: string;
};

export type AuthE2EFixture = {
  adminUserId: string;
  cleanup: () => Promise<void>;
  expectedProfileSlug: string;
  professionalUserId: string;
  readProfileSummary: () => Promise<AuthE2EProfileSummary>;
};

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `La suite autenticada requiere ${name} del stack local de Supabase.`,
    );
  }
  return value;
}

export function assertLoopbackHttpUrl(rawUrl: string, label: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${label} debe ser una URL local válida.`);
  }

  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (
    url.protocol !== "http:" ||
    !loopbackHosts.has(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      `${label} debe usar HTTP y un host loopback explícito; se rechazó ${url.origin}.`,
    );
  }

  return url;
}

export function readLocalAuthE2EEnvironment(): LocalAuthE2EEnvironment {
  const supabaseUrl = requiredEnvironmentVariable("SUPABASE_TEST_URL");
  assertLoopbackHttpUrl(supabaseUrl, "SUPABASE_TEST_URL");

  const publishableKey = requiredEnvironmentVariable(
    "SUPABASE_TEST_PUBLISHABLE_KEY",
  );
  const secretKey = requiredEnvironmentVariable("SUPABASE_TEST_SECRET_KEY");
  if (publishableKey === secretKey) {
    throw new Error(
      "Las claves publicable y de servicio del fixture no pueden coincidir.",
    );
  }

  return { publishableKey, secretKey, supabaseUrl };
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

function requireData<T>(
  result: { data: T | null; error: ErrorLike | null },
  operation: string,
) {
  assertNoError(result, operation);
  if (result.data === null) {
    throw new Error(`${operation}: la respuesta no incluyó datos.`);
  }
  return result.data;
}

function backendClient(environment: LocalAuthE2EEnvironment) {
  return createClient(environment.supabaseUrl, environment.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function listFixtureUsers(backend: SupabaseClient) {
  const result = await backend.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  assertNoError(result, "Listar usuarios para el fixture E2E");
  return result.data.users.filter(
    (user) => user.email && TEST_EMAILS.has(user.email),
  );
}

async function removeCredentialObjects(
  backend: SupabaseClient,
  users: User[],
) {
  for (const user of users) {
    const listed = await backend.storage
      .from("professional-credentials")
      .list(user.id, { limit: 1_000 });
    assertNoError(listed, "Listar documentos E2E para limpieza");

    const objectPaths = (listed.data ?? []).map(
      (object) => `${user.id}/${object.name}`,
    );
    if (objectPaths.length > 0) {
      const removed = await backend.storage
        .from("professional-credentials")
        .remove(objectPaths);
      assertNoError(removed, "Eliminar documentos E2E del bucket privado");
    }
  }
}

async function removeFixtureProfiles(backend: SupabaseClient) {
  const profilesResult = await backend
    .from("professional_profiles")
    .select("id")
    .like("slug", `${PROFILE_SLUG_PREFIX}%`);
  const profiles = requireData(
    profilesResult,
    "Buscar perfiles E2E anteriores",
  ) as ProfileIdRow[];

  for (const profile of profiles) {
    for (const [table, operation] of [
      ["reviews", "Eliminar opiniones E2E"],
      ["leads", "Eliminar consultas E2E"],
      ["subscriptions", "Eliminar suscripciones E2E"],
    ] as const) {
      const deletion = await backend
        .from(table)
        .delete()
        .eq("professional_profile_id", profile.id);
      assertNoError(deletion, operation);
    }

    const profileDeletion = await backend
      .from("professional_profiles")
      .delete()
      .eq("id", profile.id);
    assertNoError(profileDeletion, "Eliminar perfil E2E");
  }
}

async function cleanupAuthE2EFixture(backend: SupabaseClient) {
  const users = await listFixtureUsers(backend);
  await removeCredentialObjects(backend, users);
  await removeFixtureProfiles(backend);

  for (const user of users) {
    const deletion = await backend.auth.admin.deleteUser(user.id);
    assertNoError(deletion, `Eliminar usuario E2E ${user.email}`);
  }
}

async function assertNoExistingSuperadmin(backend: SupabaseClient) {
  const roleResult = await backend
    .from("roles")
    .select("id")
    .eq("code", "SUPERADMIN")
    .single();
  const role = requireData(roleResult, "Resolver rol SUPERADMIN") as IdRow;
  const assignmentsResult = await backend
    .from("user_roles")
    .select("user_id")
    .eq("role_id", role.id);
  const assignments = requireData(
    assignmentsResult,
    "Comprobar aislamiento del SUPERADMIN E2E",
  ) as Array<{ user_id: string }>;

  if (assignments.length > 0) {
    throw new Error(
      "La base local ya tiene un SUPERADMIN ajeno al fixture autenticado. Restablecé el stack aislado antes de ejecutar esta suite.",
    );
  }
}

async function createConfirmedUser(
  backend: SupabaseClient,
  email: string,
  displayName: string,
) {
  const result = await backend.auth.admin.createUser({
    email,
    password: AUTH_E2E.password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  assertNoError(result, `Crear usuario confirmado ${email}`);
  if (!result.data.user) {
    throw new Error(`Crear usuario confirmado ${email}: usuario ausente.`);
  }
  return result.data.user;
}

function expectedSlug(userId: string) {
  return `${PROFILE_SLUG_PREFIX}${userId.slice(0, 8)}`;
}

export async function createAuthE2EFixture(): Promise<AuthE2EFixture> {
  const environment = readLocalAuthE2EEnvironment();
  const backend = backendClient(environment);

  await cleanupAuthE2EFixture(backend);
  await assertNoExistingSuperadmin(backend);

  try {
    const professional = await createConfirmedUser(
      backend,
      AUTH_E2E.professionalEmail,
      AUTH_E2E.professionalFullName,
    );
    const admin = await createConfirmedUser(
      backend,
      AUTH_E2E.adminEmail,
      "Administración E2E",
    );

    const adminAcceptance = await backend.rpc(
      "accept_terms_from_signup_backend",
      {
        p_terms_version: AUTH_E2E.legalVersion,
        p_user_id: admin.id,
      },
    );
    assertNoError(adminAcceptance, "Aceptar términos para el admin E2E");

    const bootstrap = await backend.rpc(
      "bootstrap_first_superadmin_from_backend",
      { p_user_id: admin.id },
    );
    assertNoError(bootstrap, "Crear el SUPERADMIN efímero del E2E");

    const readProfileSummary = async (): Promise<AuthE2EProfileSummary> => {
      const profileResult = await backend
        .from("professional_profiles")
        .select("id,slug,publication_status,verification_state")
        .eq("user_id", professional.id)
        .single();
      const profile = requireData(
        profileResult,
        "Leer estado del perfil E2E",
      ) as ProfileRow;

      const subscriptionResult = await backend
        .from("subscriptions")
        .select("status,plans(code)")
        .eq("professional_profile_id", profile.id)
        .maybeSingle();
      assertNoError(subscriptionResult, "Leer suscripción E2E");
      const planRelation = subscriptionResult.data?.plans as
        | { code?: string }
        | { code?: string }[]
        | null
        | undefined;
      const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;

      return {
        planCode: plan?.code ?? null,
        publicationStatus: profile.publication_status,
        slug: profile.slug,
        subscriptionStatus: subscriptionResult.data?.status ?? null,
        verificationState: profile.verification_state,
      };
    };

    return {
      adminUserId: admin.id,
      cleanup: () => cleanupAuthE2EFixture(backend),
      expectedProfileSlug: expectedSlug(professional.id),
      professionalUserId: professional.id,
      readProfileSummary,
    };
  } catch (error) {
    await cleanupAuthE2EFixture(backend);
    throw error;
  }
}
