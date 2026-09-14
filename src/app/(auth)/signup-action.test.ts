import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), lookup: vi.fn(), rpc: vi.fn(), rate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/env/server", () => ({ serverEnv: { UNIVERSO_PSI_TEST_MODE: "false" } }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://universo-psi-eight.vercel.app" } }));
vi.mock("@/lib/auth/providers", () => ({ googleAvailability: vi.fn(), resolveGoogleAuthorization: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp: mocks.signup } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }), findAdminUserIdByEmail: mocks.lookup }));
vi.mock("@/lib/http/request", () => ({ hashIdentifier: () => "hash", requestFingerprint: () => "fingerprint" }));
vi.mock("@/lib/integrations/email", () => ({ deliverTransactionalEmail: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.rate }));
import { signUpAction } from "./actions";
import { initialAuthState } from "@/lib/validation/auth";
beforeEach(() => {
  vi.clearAllMocks();mocks.rate.mockResolvedValue({ allowed: true });
  mocks.signup.mockResolvedValue({ data: { user: null, session: null }, error: null });
});
it("el correo histórico de QA usa el registro normal fuera del modo de pruebas", async () => {
  const form = new FormData();
  for (const [key,value] of Object.entries({fullName:"Persona de prueba",email:"nmarcosan@gmail.com",password:"FixtureOnly123!",confirmPassword:"FixtureOnly123!",accountType:"PERSON",terms:"on",next:"/dashboard"})) form.set(key,value);
  const result = await signUpAction(initialAuthState,form);
  expect(result.status).toBe("success");
  expect(mocks.signup).toHaveBeenCalledOnce();
  expect(mocks.lookup).not.toHaveBeenCalled();
});

it("keeps transport failures actionable without exposing provider details", async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ fullName: "Persona de prueba", email: "persona@example.com", password: "FixtureOnly123!", confirmPassword: "FixtureOnly123!", accountType: "PERSON", terms: "on" })) form.set(key, value);
  mocks.signup.mockResolvedValue({ data: { user: null, session: null }, error: { status: 0, name: "AuthRetryableFetchError" } });
  const result = await signUpAction(initialAuthState, form);
  expect(result.status).toBe("error");
  expect(result.message).toContain("Tus datos siguen en el formulario");
  expect(result).not.toHaveProperty("password");
});
