import "server-only";

import { randomUUID } from "node:crypto";

import { deliverTransactionalEmail } from "@/lib/integrations/email";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  type BrandedEmail,
} from "@/lib/integrations/email-layout";
import { createAdminClient } from "@/lib/supabase/admin";

type ClaimedNotification = {
  id: number;
  channel: string;
  template_key: string;
  attempts: number;
  lock_token: string;
  recipient_email: string | null;
  recipient_name: string | null;
  professional_name: string | null;
};

type ProcessResult = {
  ok: boolean;
  claimed: number;
  sent: number;
  deferred: number;
  completionFailed: number;
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://universopsi.com";
}

function safeName(value: string | null, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim().slice(0, 80);
  return normalized || fallback;
}

function emailFor(notification: ClaimedNotification) {
  const recipientName = safeName(notification.recipient_name, "Hola");
  const professionalName = safeName(
    notification.professional_name,
    "el perfil profesional que elegiste",
  );

  if (notification.template_key === "professional_new_lead") {
    const content: BrandedEmail = {
      kicker: "Nueva consulta",
      heading: `${recipientName}, recibiste una consulta`,
      bodyText:
        "Alguien te escribió a través de Universo Psi. Ingresá a tu panel para verla y responderla de forma segura.",
      action: { label: "Ver la consulta", url: `${siteUrl()}/dashboard?seccion=consultas` },
      footerNote:
        "Por privacidad, los datos de contacto y el mensaje no viajan en este correo: se consultan dentro de tu panel.",
    };
    return {
      subject: "Recibiste una nueva consulta en Universo Psi",
      text: renderBrandedEmailText(content),
      html: renderBrandedEmailHtml(content),
    };
  }

  if (notification.template_key === "consumer_lead_confirmation") {
    const content: BrandedEmail = {
      kicker: "Consulta enviada",
      heading: `${recipientName}, recibimos tu consulta`,
      bodyText: `Tu consulta para ${professionalName} quedó registrada. La persona profesional podrá verla en su panel y decidir cómo y cuándo responderte.`,
      footerNote:
        "Todavía no hay un turno confirmado. Si no reconocés esta acción, podés ignorar este correo.",
    };
    return {
      subject: "Recibimos tu consulta en Universo Psi",
      text: renderBrandedEmailText(content),
      html: renderBrandedEmailHtml(content),
    };
  }

  return null;
}

export async function processNotificationOutbox({
  batchSize = 25,
  workerId = `universo-psi-${randomUUID()}`,
}: {
  batchSize?: number;
  workerId?: string;
} = {}): Promise<ProcessResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "claim_notification_outbox_from_backend",
    {
      p_worker_id: workerId.slice(0, 120),
      p_batch_size: Math.min(Math.max(Math.trunc(batchSize), 1), 50),
    },
  );

  if (error) {
    console.error("notification_outbox_claim_failed", { code: error.code });
    return {
      ok: false,
      claimed: 0,
      sent: 0,
      deferred: 0,
      completionFailed: 0,
    };
  }

  const notifications = (data ?? []) as ClaimedNotification[];
  const outcomes = await Promise.all(
    notifications.map(async (notification) => {
      let succeeded = false;
      let errorCode: string | null = null;
      let retryAfter: string | null = null;

      if (notification.channel !== "EMAIL") {
        errorCode = "unsupported_notification_channel";
        retryAfter = "1 day";
      } else if (!notification.recipient_email) {
        errorCode = "notification_recipient_unavailable";
        retryAfter = "1 day";
      } else {
        const message = emailFor(notification);
        if (!message) {
          errorCode = "unsupported_notification_template";
          retryAfter = "1 day";
        } else {
          try {
            const delivery = await deliverTransactionalEmail({
              to: notification.recipient_email,
              ...message,
            });
            if (delivery.status === "sent") {
              succeeded = true;
            } else if (delivery.status === "queued") {
              errorCode = "email_not_configured";
              retryAfter = "1 day";
            } else {
              errorCode = "email_provider_error";
              retryAfter = "15 minutes";
            }
          } catch {
            errorCode = "email_delivery_unexpected_error";
            retryAfter = "15 minutes";
          }
        }
      }

      const { error: completionError } = await admin.rpc(
        "complete_notification_outbox_from_backend",
        {
          p_outbox_id: notification.id,
          p_lock_token: notification.lock_token,
          p_succeeded: succeeded,
          p_error: errorCode,
          p_retry_after: retryAfter,
        },
      );

      if (completionError) {
        console.error("notification_outbox_complete_failed", {
          code: completionError.code,
          outboxId: notification.id,
        });
        return "completion_failed" as const;
      }

      return succeeded ? ("sent" as const) : ("deferred" as const);
    }),
  );

  const completionFailed = outcomes.filter(
    (outcome) => outcome === "completion_failed",
  ).length;
  return {
    ok: completionFailed === 0,
    claimed: notifications.length,
    sent: outcomes.filter((outcome) => outcome === "sent").length,
    deferred: outcomes.filter((outcome) => outcome === "deferred").length,
    completionFailed,
  };
}
