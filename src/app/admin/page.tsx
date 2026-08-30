import { ExternalLink, FileCheck2, ShieldCheck, UserRoundSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  resolveCredentialAction,
  resolvePublicationAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireCurrentUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración | Universo Psi",
  robots: { index: false, follow: false },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type PendingCredential = {
  credential_id: string;
  professional_profile_id: string;
  professional_name: string;
  credential_type_name: string;
  title: string;
  issuing_entity: string | null;
  object_path: string;
  submitted_at: string;
};

type PendingProfile = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  headline: string;
  bio: string;
  approach: string | null;
  experience_summary: string | null;
  education_summary: string | null;
  years_experience: number;
  verification_state: string;
  publication_status: string;
  updated_at: string;
  professional_type_names: string[];
  has_regulated_type: boolean;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const feedback = await searchParams;
  const user = await requireCurrentUser("/admin");
  if (!user.roles.some((role) => role === "ADMIN" || role === "SUPERADMIN")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: credentials }, { data: profileRows, error: profilesError }, { count: pendingReviews }, { count: pendingArticles }] =
    await Promise.all([
      supabase.rpc("admin_pending_credentials", { p_limit: 50 }),
      supabase.rpc("admin_pending_professional_profiles", { p_limit: 50 }),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    ]);
  if (profilesError) {
    throw new Error("No se pudieron cargar los perfiles pendientes.", {
      cause: profilesError,
    });
  }
  const profiles = (profileRows ?? []) as PendingProfile[];

  const credentialsWithLinks = await Promise.all(
    ((credentials ?? []) as PendingCredential[]).map(async (credential) => {
      const { data } = await supabase.storage
        .from("professional-credentials")
        .createSignedUrl(credential.object_path, 300);
      return { ...credential, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <main id="contenido" className="min-h-screen bg-mist py-10 sm:py-14">
      <Container>
        {feedback.notice ? (
          <p className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            Decisión registrada y auditada.
          </p>
        ) : null}
        {feedback.error ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            No pudimos registrar la decisión. Revisá los datos obligatorios e intentá nuevamente.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-senda">Operación protegida</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">Panel de revisión</h1>
            <p className="mt-4 max-w-2xl text-muted">Cada decisión valida permisos en el servidor y deja trazabilidad en la auditoría.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className={buttonStyles({ variant: "secondary" })} href="/dashboard">Volver al dashboard</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Credenciales", credentialsWithLinks.length],
            ["Perfiles", profiles.length],
            ["Opiniones", pendingReviews ?? 0],
            ["Artículos", pendingArticles ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-3xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
              <p className="mt-1 text-sm text-muted">{label} pendientes</p>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <FileCheck2 className="size-6 text-senda" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Credenciales</h2>
          </div>
          {credentialsWithLinks.length ? (
            <ul className="mt-6 divide-y divide-line">
              {credentialsWithLinks.map((credential) => (
                <li key={credential.credential_id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{credential.professional_name}</p>
                      <p className="mt-1 text-sm text-muted">{credential.credential_type_name} · {credential.title}</p>
                      <p className="mt-1 text-xs text-muted">Recibida {formatDate(credential.submitted_at)}</p>
                      {credential.issuing_entity ? <p className="mt-3 text-sm text-ink">Emisor: {credential.issuing_entity}</p> : null}
                      {credential.signedUrl ? (
                        <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-senda underline-offset-4 hover:underline" href={credential.signedUrl} target="_blank" rel="noreferrer">
                          Abrir documento <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      ) : <p className="mt-3 text-sm text-red-700">No se pudo generar el acceso temporal.</p>}
                    </div>
                    <form action={resolveCredentialAction} className="w-full max-w-md rounded-2xl border border-line bg-mist p-4">
                      <input type="hidden" name="credentialId" value={credential.credential_id} />
                      <label className="block text-sm font-semibold text-ink">
                        Notas internas / motivo si se rechaza
                        <textarea className="mt-2 min-h-20 w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink" name="notes" maxLength={2000} />
                      </label>
                      <label className="mt-3 block text-sm font-semibold text-ink">
                        Válida hasta (opcional)
                        <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" type="date" name="validUntil" />
                      </label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="min-h-11 rounded-full bg-senda px-4 text-sm font-semibold text-white" type="submit" name="status" value="APPROVED">Aprobar</button>
                        <button className="min-h-11 rounded-full border border-red-300 bg-paper px-4 text-sm font-semibold text-red-800" type="submit" name="status" value="REJECTED">Rechazar</button>
                      </div>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-mist p-8 text-center">
              <ShieldCheck className="mx-auto size-7 text-senda" aria-hidden="true" />
              <p className="mt-3 font-semibold text-ink">No hay credenciales pendientes.</p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <UserRoundSearch className="size-6 text-senda" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Perfiles para publicar</h2>
          </div>
          {profiles.length ? (
            <ul className="mt-6 divide-y divide-line">
              {profiles.map((profile) => (
                <li key={profile.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{profile.first_name} {profile.last_name}</p>
                        <Badge tone={profile.verification_state === "VERIFIED" ? "senda" : "neutral"}>{profile.verification_state}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">{profile.headline}</p>
                      <details className="mt-4 rounded-2xl border border-line bg-paper p-4">
                        <summary className="min-h-10 cursor-pointer font-semibold text-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/25">
                          Revisar perfil completo
                        </summary>
                        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                          <div className="sm:col-span-2"><dt className="font-semibold text-ink">Sobre la persona</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">{profile.bio}</dd></div>
                          <div className="sm:col-span-2"><dt className="font-semibold text-ink">Cómo trabaja</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">{profile.approach ?? "No informado"}</dd></div>
                          <div><dt className="font-semibold text-ink">Experiencia</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">{profile.experience_summary ?? "No informada"}</dd></div>
                          <div><dt className="font-semibold text-ink">Formación</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">{profile.education_summary ?? "No informada"}</dd></div>
                          <div><dt className="font-semibold text-ink">Trayectoria</dt><dd className="mt-1 text-muted">{profile.years_experience} años declarados</dd></div>
                        </dl>
                        <p className="mt-4 text-xs leading-relaxed text-muted">La URL pública se habilita únicamente después de aprobar la publicación.</p>
                      </details>
                    </div>
                    <form action={resolvePublicationAction} className="w-full max-w-md rounded-2xl border border-line bg-mist p-4">
                      <input type="hidden" name="profileId" value={profile.id} />
                      <label className="block text-sm font-semibold text-ink">Motivo si se rechaza<textarea className="mt-2 min-h-20 w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink" name="reason" maxLength={1000} /></label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="min-h-11 rounded-full bg-senda px-4 text-sm font-semibold text-white" type="submit" name="status" value="PUBLISHED">Publicar</button>
                        <button className="min-h-11 rounded-full border border-red-300 bg-paper px-4 text-sm font-semibold text-red-800" type="submit" name="status" value="REJECTED">Rechazar</button>
                      </div>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-line bg-mist p-8 text-center text-sm text-muted">No hay perfiles esperando publicación.</p>
          )}
        </section>
      </Container>
    </main>
  );
}
