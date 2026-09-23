import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), checkout: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/dal/auth", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/subscriptions/checkout", () => ({ createHostedCheckoutRedirectUrl: mocks.checkout }));
vi.mock("@/lib/integrations/payments", () => ({ paymentAvailability: () => ({ configured: true }) }));
import { saveOnboardingAction } from "./actions";
const profileId = "20000000-0000-4000-8000-000000000001";
const subscriptionId = "30000000-0000-4000-8000-000000000001";
function form(intent = "checkout") {
  const f = new FormData();f.set("profileId", profileId);f.set("planCode", "PROFESSIONAL_MONTHLY");f.set("intent", intent);return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "owner", email: "fixture@example.invalid" });
  mocks.rpc.mockResolvedValue({ data: subscriptionId, error: null });
  mocks.checkout.mockResolvedValue("/dashboard/suscripcion/pagar?subscriptionId=fixture");
});
describe("pago separado de la revisión del perfil", () => {
  it("permite pagar el borrador sin presentación ni documentos y no lo envía a revisión", async () => {
    await expect(saveOnboardingAction({ status: "saved", profileId }, form())).rejects.toThrow("redirect:/dashboard/suscripcion/pagar?subscriptionId=fixture");
    expect(mocks.user).toHaveBeenCalledExactlyOnceWith("/profesionales/sumarse");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("select_professional_plan", { p_profile_id: profileId, p_plan_code: "PROFESSIONAL_MONTHLY" });
    expect(mocks.checkout).toHaveBeenCalledExactlyOnceWith(expect.anything(), { subscriptionId, profileId });
  });
  it("respeta el rechazo del plan o de la propiedad sin abrir checkout", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "42501" }, data: null });
    expect((await saveOnboardingAction({ status: "saved", profileId }, form())).status).toBe("error");
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("conserva la revisión explícita y sus restricciones", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: subscriptionId, error: null }).mockResolvedValueOnce({ error: { code: "23514" } });
    expect((await saveOnboardingAction({ status: "saved", profileId }, form("submit"))).status).toBe("error");
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "submit_professional_profile", { p_profile_id: profileId });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("no afirma envío a revisión cuando el checkout no está disponible", async () => {
    mocks.checkout.mockResolvedValue(null);
    const result = await saveOnboardingAction({ status: "saved", profileId }, form());
    expect(result.status).toBe("error");
    expect(result.message).toContain("borrador está guardado");
  });
});
