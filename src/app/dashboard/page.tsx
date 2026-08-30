import { ArrowRight, BarChart3, CircleDot, Eye, MessageSquareText, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateLeadStatusAction } from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal/auth";
import type { MyProfessionalProfile } from "@/lib/supabase/contracts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const profileStateCopy: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  REJECTED: "Con observaciones",
  SUSPENDED: "Pausado",
};

const leadStateCopy: Record<string, string> = {
  NEW: "Nueva",
  VIEWED: "Vista",
  CONTACTED: "Contactada",
  QUALIFIED: "Calificada",
  CONVERTED: "Convertida",
  CLOSED: "Cerrada",
  SPAM: "Spam",
};

const leadTransitions: Record<string, string[]> = {
  NEW: ["VIEWED", "CLOSED", "SPAM"],
  VIEWED: ["CONTACTED", "CLOSED", "SPAM"],
  CONTACTED: ["QUALIFIED", "CONVERTED", "CLOSED", "SPAM"],
  QUALIFIED: ["CONVERTED", "CLOSED", "SPAM"],
  CONVERTED: ["CLOSED"],
  CLOSED: [],
  SPAM: [],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type DashboardLead = {
  lead_id: string;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string;
  contact_preference: string;
  need_name: string | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const feedback = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/dashboard");

  const supabase = await createClient();
  const { data: profileRow, error: profileError } = await supabase
    .rpc("my_professional_profile")
    .maybeSingle();
  if (profileError) {
    throw new Error("No se pudo cargar el perfil profesional.", {
      cause: profileError,
    });
  }
  const profile = profileRow as MyProfessionalProfile | null;

  if (!profile) {
    return (
      <section className="rounded-[2rem] border border-line bg-paper p-7 sm:p-10">
        <div className="flex size-12 items-center justify-center rounded-full bg-senda/10 text-senda">
          <UserRoundCheck aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-senda">Primer paso</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-ink">Construí un perfil que explique cómo podés ayudar.</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted">Guardalo como borrador, cargá tus credenciales de forma privada y envialo cuando esté listo.</p>
        <Link className={`${buttonStyles({ size: "lg" })} mt-8`} href="/profesionales/sumarse">
          Crear mi perfil <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const [{ data: leads }, { data: subscription }, { data: metrics }] = await Promise.all([
    supabase.rpc("my_professional_leads", { p_profile_id: profile.id, p_limit: 20 }),
    supabase
      .from("subscriptions")
      .select("status,current_period_end,plans(code,name)")
      .eq("professional_profile_id", profile.id)
      .in("status", ["PENDING_PAYMENT", "TRIALING", "ACTIVE", "PAST_DUE", "PAUSED"])
      .maybeSingle(),
    supabase
      .from("professional_metrics_daily")
      .select("impressions,profile_views,contact_starts,leads")
      .eq("professional_profile_id", profile.id)
      .order("metric_date", { ascending: false })
      .limit(30),
  ]);

  const totals = (metrics ?? []).reduce(
    (sum, day) => ({
      impressions: sum.impressions + Number(day.impressions),
      profileViews: sum.profileViews + Number(day.profile_views),
      contactStarts: sum.contactStarts + Number(day.contact_starts),
      leads: sum.leads + Number(day.leads),
    }),
    { impressions: 0, profileViews: 0, contactStarts: 0, leads: 0 },
  );
  const professionalLeads = (leads ?? []) as DashboardLead[];
  const newLeadCount = professionalLeads.filter((lead) => lead.status === "NEW").length;
  const planRelation = subscription?.plans as { code?: string; name?: string } | { code?: string; name?: string }[] | null | undefined;
  const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;

  return (
    <div className="space-y-7">
      {feedback.notice === "lead-updated" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Estado de la consulta actualizado.
        </p>
      ) : null}
      {feedback.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          No pudimos actualizar esa consulta. Revisá la transición e intentá nuevamente.
        </p>
      ) : null}
      <section className="rounded-[2rem] border border-line bg-paper p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Panel profesional</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">Hola, {profile.first_name}.</h1>
            <p className="mt-3 text-muted">Una vista clara de tu perfil y las personas que te contactaron.</p>
          </div>
          <Badge tone={profile.publication_status === "PUBLISHED" ? "senda" : "neutral"}>
            {profileStateCopy[profile.publication_status] ?? profile.publication_status}
          </Badge>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Apariciones", value: totals.impressions, icon: Eye },
            { label: "Visitas al perfil", value: totals.profileViews, icon: BarChart3 },
            { label: "Contactos iniciados", value: totals.contactStarts, icon: MessageSquareText },
            { label: "Consultas nuevas", value: newLeadCount, icon: CircleDot },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-line bg-mist p-5">
              <Icon className="size-5 text-senda" aria-hidden="true" />
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="leads" className="scroll-mt-28 rounded-[2rem] border border-line bg-paper p-7 sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Consultas</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">Conversaciones por empezar</h2>
          </div>
          <span className="text-sm text-muted">Últimas 20</span>
        </div>
        {professionalLeads.length ? (
          <ul className="mt-6 divide-y divide-line">
            {professionalLeads.map((lead) => (
              <li key={lead.lead_id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{lead.full_name}</p>
                      <Badge tone={lead.status === "NEW" ? "clay" : "neutral"}>{leadStateCopy[lead.status] ?? lead.status}</Badge>
                      <span className="text-xs text-muted">{formatDate(lead.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{lead.need_name ?? "Consulta general"} · {lead.contact_preference}</p>
                    <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-relaxed text-ink">{lead.message}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a className="font-semibold text-senda underline-offset-4 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>
                      {lead.phone ? <a className="font-semibold text-senda underline-offset-4 hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a> : null}
                    </div>
                  </div>
                  {(leadTransitions[lead.status] ?? []).length ? <form action={updateLeadStatusAction} className="flex shrink-0 gap-2">
                    <input type="hidden" name="leadId" value={lead.lead_id} />
                    <label className="sr-only" htmlFor={`lead-status-${lead.lead_id}`}>Estado de la consulta</label>
                    <select id={`lead-status-${lead.lead_id}`} className="min-h-11 rounded-xl border border-line bg-paper px-3 text-sm font-semibold text-ink" name="status">
                      {(leadTransitions[lead.status] ?? []).map((status) => <option key={status} value={status}>{leadStateCopy[status] ?? status}</option>)}
                    </select>
                    <button className="min-h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white" type="submit">Guardar</button>
                  </form> : <span className="shrink-0 text-sm font-semibold text-muted">Estado final</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-mist p-8 text-center">
            <MessageSquareText className="mx-auto size-7 text-senda" aria-hidden="true" />
            <p className="mt-4 font-semibold text-ink">Todavía no llegaron consultas.</p>
            <p className="mt-2 text-sm text-muted">Cuando alguien te contacte, vas a encontrar el mensaje y su preferencia de contacto acá.</p>
          </div>
        )}
      </section>

      <div className="grid gap-7 xl:grid-cols-2">
        <section id="suscripcion" className="scroll-mt-28 rounded-[2rem] border border-line bg-paper p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Suscripción</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">{plan?.name ?? "Sin plan seleccionado"}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {subscription?.status === "ACTIVE"
              ? "Tu suscripción está activa. El próximo cobro es automático a través de Mercado Pago."
              : subscription?.status === "PENDING_PAYMENT"
                ? "Tu elección está guardada. Completá el pago en Mercado Pago para activar tu suscripción."
                : subscription?.status === "PAST_DUE"
                  ? "Hay un pago pendiente. Revisá tu método de pago en Mercado Pago para evitar la suspensión."
                  : subscription?.status === "PAUSED"
                    ? "Tu suscripción está pausada."
                    : subscription?.status === "CANCELED"
                      ? "Tu suscripción fue cancelada."
                      : "Elegí el plan para tener presencia profesional en Universo Psi."}
          </p>
          <Link className={`${buttonStyles({ variant: "secondary" })} mt-6`} href="/planes">Ver planes</Link>
        </section>
        <section id="contenido" className="scroll-mt-28 rounded-[2rem] border border-line bg-paper p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Autoridad</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Compartí conocimiento</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">La publicación profesional llegará en la siguiente iteración. La arquitectura editorial ya contempla autoría y moderación.</p>
          <span className="mt-6 inline-flex rounded-full bg-mist px-4 py-2 text-xs font-bold text-muted">Próximamente</span>
        </section>
      </div>
    </div>
  );
}
