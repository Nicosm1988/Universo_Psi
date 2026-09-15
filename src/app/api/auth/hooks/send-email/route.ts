import { NextResponse, type NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { z } from "zod";

import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import { readTextBody, RequestBodyTooLargeError } from "@/lib/http/body";
import { safeInternalPath } from "@/lib/http/origin";
import {
  renderAuthEmailHtml,
  renderAuthEmailText,
  resolveAuthEmailContent,
} from "@/lib/integrations/auth-email-templates";
import { deliverTransactionalEmail } from "@/lib/integrations/email";

// Supabase's Auth "Send Email" hook replaces Supabase's own mailer entirely:
// once enabled, Supabase calls this endpoint instead of sending its
// own-branded email, so every auth email (signup, recovery, etc.) is
// rendered and delivered by us via Resend, and the link inside points at
// our own domain (never *.supabase.co). Signed with the Standard Webhooks
// scheme; secret comes from Supabase Dashboard > Authentication > Hooks.
// Uses the official `standardwebhooks` library rather than a hand-rolled
// HMAC check — a prior manual implementation rejected genuinely-signed
// Supabase requests (401 on every real signup, not just our own test
// pings), which silently blocked real users from registering at all.

const hookPayloadSchema = z.object({
  user: z.object({ email: z.email().max(320) }),
  email_data: z.object({
    token_hash: z.string().min(1).max(2048),
    redirect_to: z.string().max(4096).default(""),
    email_action_type: z.enum(["signup", "recovery", "invite", "email_change", "email", "magiclink"]),
  }),
});

export async function POST(request: NextRequest) {
  if (!serverEnv.SEND_EMAIL_HOOK_SECRET) {
    console.error("send_email_hook_not_configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const headers = Object.fromEntries(request.headers);

  let payload: z.infer<typeof hookPayloadSchema>;
  try {
    // Bound streamed bodies too, without changing the bytes used for signature verification.
    const body = await readTextBody(request, 64 * 1024);
    const wh = new Webhook(serverEnv.SEND_EMAIL_HOOK_SECRET.replace(/^v1,/, ""));
    payload = hookPayloadSchema.parse(wh.verify(body, headers));
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (err instanceof WebhookVerificationError) {
      console.error("send_email_hook_invalid_signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    console.error("send_email_hook_invalid_payload");
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { user, email_data: emailData } = payload;
  const actionUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  actionUrl.searchParams.set("token_hash", emailData.token_hash);
  actionUrl.searchParams.set("type", emailData.email_action_type);
  try {
    const redirectTo = new URL(emailData.redirect_to);
    if (redirectTo.origin === actionUrl.origin) {
      actionUrl.searchParams.set("next", safeInternalPath(redirectTo.searchParams.get("next")));
    }
  } catch {
    // A stale or malformed redirect must not prevent delivery of the canonical link.
  }

  const content = resolveAuthEmailContent(emailData.email_action_type);
  const result = await deliverTransactionalEmail({
    to: user.email,
    subject: content.subject,
    text: renderAuthEmailText(content, actionUrl.toString()),
    html: renderAuthEmailHtml(content, actionUrl.toString()),
  });

  if (result.status === "failed" || result.status === "queued") {
    console.error("send_email_hook_delivery_failed", { status: result.status });
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
