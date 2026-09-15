import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deliver: vi.fn(), env: { SEND_EMAIL_HOOK_SECRET: "" } }));
vi.mock("@/lib/env/server", () => ({ serverEnv: mocks.env }));
vi.mock("@/lib/env/public", () => ({ publicEnv: { NEXT_PUBLIC_SITE_URL: "https://psi.example" } }));
vi.mock("@/lib/integrations/email", () => ({ deliverTransactionalEmail: mocks.deliver }));
vi.mock("server-only", () => ({}));
import { POST } from "./route";

const payload = { user: { email: "test@example.test" }, email_data: {
  token_hash: "test-hash", redirect_to: "https://psi.example/auth/callback?next=%2Fdashboard", email_action_type: "signup",
} };
function signed(body: string) {
  const date = new Date();
  const signature = new Webhook(mocks.env.SEND_EMAIL_HOOK_SECRET).sign("test-event", date, body);
  return new NextRequest("https://psi.example/api/auth/hooks/send-email", { method: "POST", body,
    headers: { "webhook-id": "test-event", "webhook-timestamp": String(Math.floor(date.getTime() / 1000)), "webhook-signature": signature } });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.SEND_EMAIL_HOOK_SECRET = randomBytes(32).toString("base64");
  mocks.deliver.mockResolvedValue({ status: "sent" });
});
describe("signed auth email hook", () => {
  it("accepts genuine signatures over original whitespace and sends canonical links", async () => {
    expect((await POST(signed(JSON.stringify(payload, null, 2)))).status).toBe(200);
    expect(mocks.deliver).toHaveBeenCalledWith(expect.objectContaining({ to: payload.user.email, text: expect.stringContaining("https://psi.example/auth/confirm?") }));
  });
  it("rejects unsigned requests before delivery", async () => {
    expect((await POST(new NextRequest("https://psi.example/api", { method: "POST", body: JSON.stringify(payload) }))).status).toBe(401);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it.each([{}, { ...payload, user: { email: "not-email" } }, { ...payload, email_data: { ...payload.email_data, email_action_type: "unknown" } }])("rejects malformed signed payloads", async (invalid) => {
    expect((await POST(signed(JSON.stringify(invalid)))).status).toBe(400);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("rejects oversized streamed bodies without a content-length header", async () => {
    expect((await POST(signed("x".repeat(65537)))).status).toBe(413);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it.each(["not a URL", "https://attacker.example/?next=/admin", "https://psi.example/?next=//attacker.example"]) ("keeps redirect input on the canonical site: %s", async (redirect_to) => {
    expect((await POST(signed(JSON.stringify({ ...payload, email_data: { ...payload.email_data, redirect_to } })))).status).toBe(200);
    expect(mocks.deliver.mock.calls[0]?.[0].text).not.toContain("attacker.example");
  });
  it("reports delivery failure so the provider can retry", async () => {
    mocks.deliver.mockResolvedValue({ status: "failed" });
    expect((await POST(signed(JSON.stringify(payload)))).status).toBe(500);
  });
});
