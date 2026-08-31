import { NextResponse, type NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";

import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
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

type HookPayload = {
  user: { email: string };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
  };
};

export async function POST(request: NextRequest) {
  if (!serverEnv.SEND_EMAIL_HOOK_SECRET) {
    console.error("send_email_hook_not_configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let payload: HookPayload;
  try {
    const wh = new Webhook(serverEnv.SEND_EMAIL_HOOK_SECRET.replace(/^v1,/, ""));
    payload = wh.verify(body, headers) as HookPayload;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("send_email_hook_invalid_signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    console.error("send_email_hook_invalid_payload", err);
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { user, email_data: emailData } = payload;
  const actionUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  actionUrl.searchParams.set("token_hash", emailData.token_hash);
  actionUrl.searchParams.set("type", emailData.email_action_type);
  const next = emailData.redirect_to
    ? new URL(emailData.redirect_to).searchParams.get("next")
    : null;
  if (next) actionUrl.searchParams.set("next", next);

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
