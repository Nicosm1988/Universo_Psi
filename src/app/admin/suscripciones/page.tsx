import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  expirePastDueSubscriptionsAction,
  reconcileSubscriptionAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireCurrentUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suscripciones | Administración | Universo Psi",
  robots: { index: false, follow: false },
};

type SubscriptionRow = {
  subscription_id: string;
  professional_profile_id: string;
  professional_name: string;
  internal_plan_code: string;
  internal_plan_name: string;
  provider: string | null;
  provider_account: string | null;
  provider_subscription_id: string | null;
  provider_plan_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  commitment_cycles: number | null;
  commitment_ends_at: string | null;
  last_payment_at: string | null;
  next_payment_at: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

const STATUS_TONE: Record<string, "senda" | "clay" | "neutral"> = {
  ACTIVE: "senda",
  PENDING_PAYMENT: "neutral",
  PAST_DUE: "clay",
  PAUSED: "clay",
  CANCELED: "clay",
  EXPIRED: "clay",
  TRIALING: "neutral",
};

const NOTICES: Record<string, string> = {
  "reconcile-done": "Suscripción reconciliada contra Mercado Pago.",
  "expire-done": "Se actualizaron las suscripciones vencidas por período de gracia.",
};

const ERRORS: Record<string, string> = {
  "reconcile-invalid": "Falta el identificador de la suscripción.",
  "reconcile-not-linked": "Esta suscripción todavía no tiene un checkout de Mercado Pago vinculado.",
  "reconcile-one-time-unsupported": "La reconciliación manual sólo está disponible para planes recurrentes.",
  "reconcile-failed": "No pudimos reconciliar contra Mercado Pago. Revisá los logs del servidor.",
  "expire-failed": "No pudimos actualizar las suscripciones vencidas.",
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const feedback = await searchParams;
  const user = await requireCurrentUser("/admin/suscripciones");
  if (!user.roles.some((role) => role === "ADMIN" || role === "SUPERADMIN")) {
    redirect("/dashboard" as Route);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_subscription_overview")
    .select("*")
    .order("updated_at", { ascending: false });

  const subscriptions = (data ?? []) as SubscriptionRow[];

  return (
    <main id="contenido" className="bg-paper py-12 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Administración</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
              Suscripciones
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Plan interno, cuenta de Mercado Pago, estado y últimos/próximos cobros por profesional.
              Nunca activa nada por sí sola: sólo re-consulta el estado real contra Mercado Pago.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Volver a Administración
            </Link>
            <form action={expirePastDueSubscriptionsAction}>
              <button type="submit" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Expirar vencidas por gracia
              </button>
            </form>
          </div>
        </div>

        {feedback.notice && NOTICES[feedback.notice] ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            {NOTICES[feedback.notice]}
          </p>
        ) : null}
        {feedback.error && ERRORS[feedback.error] ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {ERRORS[feedback.error]}
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            No pudimos cargar las suscripciones.
          </p>
        ) : null}

        <div className="mt-8 overflow-x-auto rounded-[1.5rem] border border-line bg-canvas">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-bold uppercase tracking-[0.08em] text-muted">
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Plan interno</th>
                <th className="px-4 py-3">Cuenta MP</th>
                <th className="px-4 py-3">Provider subscription id</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último cobro</th>
                <th className="px-4 py-3">Próximo cobro</th>
                <th className="px-4 py-3">Gracia hasta</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((row) => (
                <tr key={row.subscription_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{row.professional_name}</td>
                  <td className="px-4 py-3 text-muted">{row.internal_plan_name}</td>
                  <td className="px-4 py-3 text-muted">{row.provider_account ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {row.provider_subscription_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[row.status] ?? "clay"}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.last_payment_at)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.next_payment_at)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.grace_period_ends_at)}</td>
                  <td className="px-4 py-3">
                    <form action={reconcileSubscriptionAction}>
                      <input type="hidden" name="subscriptionId" value={row.subscription_id} />
                      <button
                        type="submit"
                        className={buttonStyles({ variant: "secondary", size: "sm" })}
                        disabled={!row.provider_subscription_id}
                      >
                        Reconciliar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                    Todavía no hay suscripciones.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Container>
    </main>
  );
}
