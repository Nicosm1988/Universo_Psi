import "server-only";

import { Resend } from "resend";

import { serverEnv } from "@/lib/env/server";

export type EmailDeliveryResult =
  | { status: "sent"; providerId: string | null }
  | { status: "queued"; reason: "not_configured" }
  | { status: "failed"; reason: "provider_error" };

export async function deliverTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailDeliveryResult> {
  if (
    !serverEnv.RESEND_API_KEY ||
    !serverEnv.EMAIL_FROM ||
    input.subject.includes("\n") ||
    input.subject.includes("\r")
  ) {
    return { status: "queued", reason: "not_configured" };
  }

  const resend = new Resend(serverEnv.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: serverEnv.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) return { status: "failed", reason: "provider_error" };
  return { status: "sent", providerId: data?.id ?? null };
}
