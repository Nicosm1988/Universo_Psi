import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ configured: vi.fn(), verify: vi.fn(), process: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/paypal", () => ({ paypalConfigured: mocks.configured, verifyPayPalWebhook: mocks.verify }));
vi.mock("@/lib/subscriptions/paypal", async () => {
  const { z } = await import("zod");
  return { paypalEventSchema: z.object({ id: z.string(), event_type: z.string(), resource: z.object({}).passthrough() }).passthrough(), processPayPalEvent: mocks.process };
});
import { POST } from "./route";
const request = () => new NextRequest("https://psi.example/api/webhooks/paypal", { method: "POST", body: JSON.stringify({ id: "WH-1", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-TEST", email_address: "different@example.test" } }) });
beforeEach(() => { vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.verify.mockResolvedValue(true); mocks.process.mockResolvedValue(undefined); });
it("firma rechazada no llega a la activación", async () => { mocks.verify.mockResolvedValue(false); expect((await POST(request())).status).toBe(401); expect(mocks.process).not.toHaveBeenCalled(); });
it("falla cerrada sin configuración", async () => { mocks.configured.mockReturnValue(false); expect((await POST(request())).status).toBe(503); expect(mocks.verify).not.toHaveBeenCalled(); });
it("firma válida precede consulta server-side", async () => { expect((await POST(request())).status).toBe(200); expect(mocks.verify.mock.invocationCallOrder[0]).toBeLessThan(mocks.process.mock.invocationCallOrder[0]!); });
it("fallo de API o persistencia pide reentrega", async () => { mocks.process.mockRejectedValue(new Error("private")); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private"); });
