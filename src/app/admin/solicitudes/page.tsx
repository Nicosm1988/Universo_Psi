import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";
import { legalRequestKinds } from "@/lib/validation/legal-request";
import { updateLegalRequest } from "./actions";
export const metadata: Metadata = { title: "Solicitudes recibidas", robots: { index: false, follow: false } };
export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await requireAdmin("/admin/solicitudes");
  const feedback = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_legal_requests");
  if (error) throw new Error("No se pudieron cargar las solicitudes.");
  const rows = (data ?? []) as { id: string; kind: keyof typeof legalRequestKinds; email: string; message: string; created_at: string; status: string; resolution: string | null }[];
  return <main id="contenido" className="bg-paper py-12"><Container className="max-w-3xl"><Link href="/admin" className="underline">Volver a administración</Link><h1 className="mt-5 text-3xl font-semibold">Solicitudes recibidas</h1><p className="my-5 text-muted">Primero se muestran las pendientes, de más antiguas a más nuevas (hasta 200). Verificá identidad antes de cambiar una cuenta, cancelar cobros o entregar datos. Marcar como resuelta sólo registra la gestión: no cancela Mercado Pago ni envía correos.</p>{feedback.error ? <p role="alert">No se guardó el cambio. Revisá los datos y reintentá.</p> : null}{feedback.ok ? <p role="status">Gestión registrada.</p> : null}{rows.length === 0 ? <p>No hay solicitudes registradas.</p> : rows.map((row) => <article key={row.id} className="my-6 rounded-2xl border border-line p-5"><h2 className="text-xl font-semibold">{legalRequestKinds[row.kind]}</h2><p className="mt-2 break-all">{row.email}</p><p className="text-sm">{new Date(row.created_at).toLocaleString("es-AR")} · {row.id}</p><p className="my-4 whitespace-pre-wrap break-words">{row.message}</p><form action={updateLegalRequest} className="space-y-3"><input name="id" type="hidden" value={row.id} /><label className="block">Estado<select name="status" defaultValue={row.status} className="ml-3 min-h-11 rounded border border-line bg-paper p-2"><option value="OPEN">Pendiente</option><option value="IN_PROGRESS">En gestión</option><option value="RESOLVED">Resuelta</option></select></label><label className="block">Gestión realizada y evidencia<textarea name="note" required minLength={10} maxLength={2000} defaultValue={row.resolution ?? ""} className="mt-2 min-h-24 w-full rounded border border-line bg-paper p-3" /></label><button className="min-h-11 rounded-full bg-senda px-5 text-white">Guardar gestión</button></form></article>)}</Container></main>;
}
