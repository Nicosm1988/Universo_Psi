import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://sandbox.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key",
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      order: mocks.read,
    };
    return { from: () => query };
  },
}));

import { publicRepository } from "./public-repository";
import { selectPlanSchema } from "@/lib/validation/subscription";

const monthlyPlan = {
  code: "PROFESSIONAL_MONTHLY",
  name: "Profesional mensual",
  description: "Descripción publicada en la base",
  price_amount: "120000",
  currency: "ARS",
  pricing_status: "PUBLISHED",
};

beforeEach(() => {
  vi.stubEnv("UNIVERSO_PSI_TEST_MODE", "false");
  mocks.read.mockResolvedValue({ data: [monthlyPlan], error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("catálogo de planes de la base", () => {
  it("muestra el mensual publicado y enlaza al código aceptado por la selección", async () => {
    const plans = await publicRepository.listPlans();
    expect(plans).toHaveLength(1);
    const plan = plans[0];
    if (!plan) throw new Error("Falta el plan mensual publicado");
    expect(plan).toMatchObject({
      name: monthlyPlan.name,
      description: monthlyPlan.description,
      monthlyPrice: 120000,
      currency: "ARS",
    });
    expect(selectPlanSchema.shape.planCode.safeParse(plan.slug.toUpperCase()).success).toBe(true);
    expect(plan.slug.toUpperCase()).toBe(monthlyPlan.code);
  });

  it("no ofrece un precio de presentación cuando el plan está DRAFT", async () => {
    mocks.read.mockResolvedValue({ data: [{ ...monthlyPlan, pricing_status: "DRAFT" }], error: null });
    expect((await publicRepository.listPlans()).filter((plan) => plan.monthlyPrice !== null)).toEqual([]);
  });

  it("no reemplaza una consulta vacía o fallida con planes de prueba", async () => {
    mocks.read.mockResolvedValue({ data: [], error: null });
    expect(await publicRepository.listPlans()).toEqual([]);
    mocks.read.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(publicRepository.listPlans()).rejects.toThrow("No se pudieron cargar los planes.");
  });
});
