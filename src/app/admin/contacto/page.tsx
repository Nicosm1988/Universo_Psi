import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_TOPICS } from "@/lib/validation/support";
import { updateSupportRequest } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mensajes de contacto",
  robots: { index: false, follow: false },
};

type SupportRequest = {
  id: string;
  topic: string;
  status: string;
  full_name: string;
  email: string;
  message: string;
  landing_path: string | null;
  consent_version: string;
  consented_at: string;
  internal_notes: string | null;
  created_at: string;
};

const topicLabels = new Map(SUPPORT_TOPICS.map((topic) => [topic.value as string, topic.label]));

const fieldClassName = "min-h-11 rounded-xl border border-line bg-paper p-2 text-sm text-ink";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export default async function AdminSupportRequests({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin("/admin/contacto");
  const feedback = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_support_requests", { p_limit: 100 });
  if (error) throw new Error("No se pudieron cargar los mensajes de contacto.");
  const rows = (data ?? []) as SupportRequest[];

  return (
    <main id="contenido" className="bg-paper py-12">
      <Container className="max-w-3xl">
        <Link href="/admin" className="underline">
          Volver a administración
        </Link>
        <h1 className="mt-5 text-3xl font-semibold text-ink">Mensajes de contacto</h1>
        <p className="my-5 leading-7 text-muted">
          Canal general: reportes de perfiles o contenidos, avisos de seguridad, soporte y consultas
          comerciales. Las bajas, los arrepentimientos y los derechos sobre datos se atienden en{" "}
          <Link className="underline" href="/admin/solicitudes">
            solicitudes
          </Link>
          , no acá. Cambiar el estado sólo registra la gestión: no envía correos.
        </p>

        {feedback.error ? (
          <p role="alert" className="rounded-xl border border-clay/25 bg-clay-soft px-4 py-3 text-sm text-clay-dark">
            No se guardó el cambio. Revisá los datos y reintentá.
          </p>
        ) : null}
        {feedback.ok ? (
          <p role="status" className="rounded-xl border border-senda/25 bg-senda-soft px-4 py-3 text-sm text-ink">
            Gestión registrada.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center text-sm text-muted">
            No hay mensajes de contacto registrados.
          </p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="my-6 rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">{topicLabels.get(row.topic) ?? row.topic}</h2>
                <Badge tone={row.status === "NEW" ? "senda" : "neutral"}>{row.status}</Badge>
              </div>
              <p className="mt-2 break-all text-ink">
                {row.full_name} · {row.email}
              </p>
              <p className="text-sm text-muted">
                {formatDate(row.created_at)} · {row.id}
              </p>
              <p className="my-4 whitespace-pre-wrap break-words leading-7 text-muted">{row.message}</p>
              <p className="text-xs text-muted">
                Consentimiento {row.consent_version} · {formatDate(row.consented_at)}
                {row.landing_path ? ` · desde ${row.landing_path}` : ""}
              </p>

              <form action={updateSupportRequest} className="mt-4 space-y-3">
                <input name="id" type="hidden" value={row.id} />
                <label className="block text-sm font-semibold text-ink">
                  Estado
                  <select name="status" defaultValue={row.status} className={`ml-3 ${fieldClassName}`}>
                    <option value="NEW">Pendiente</option>
                    <option value="IN_PROGRESS">En gestión</option>
                    <option value="RESOLVED">Resuelto</option>
                    <option value="SPAM">Spam</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-ink">
                  Nota interna
                  <textarea
                    name="note"
                    maxLength={4000}
                    defaultValue={row.internal_notes ?? ""}
                    className="mt-2 min-h-24 w-full rounded-xl border border-line bg-paper p-3 text-sm font-normal text-ink"
                  />
                </label>
                <button className="min-h-11 rounded-full bg-senda px-5 text-sm font-semibold text-white">
                  Guardar gestión
                </button>
              </form>
            </article>
          ))
        )}
      </Container>
    </main>
  );
}
