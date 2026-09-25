import type { Metadata, Route } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { AccountChip } from "@/components/public/account-chip";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireCurrentUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi espacio | Universo Psi",
  robots: { index: false, follow: false },
};

type ConsultaRow = {
  id: string;
  status: string;
  created_at: string;
  professional_profiles: { slug: string; first_name: string; last_name: string } | null;
};

// Lo que ve quien consulta, no lo que ve el profesional: nunca el estado
// comercial interno, sólo si su mensaje fue leído y si le respondieron.
const ESTADOS: Record<string, string> = {
  NEW: "Enviada",
  VIEWED: "Vista por el profesional",
  CONTACTED: "Te respondieron",
  QUALIFIED: "En conversación",
  CONVERTED: "En conversación",
  CLOSED: "Cerrada",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date(value));
}

export default async function MiEspacioPage() {
  const user = await requireCurrentUser("/mi-espacio");
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("id,status,created_at,professional_profiles(slug,first_name,last_name)")
    .eq("consumer_user_id", user.id)
    .neq("status", "SPAM")
    .order("created_at", { ascending: false })
    .limit(20);

  const consultas = (data ?? []) as unknown as ConsultaRow[];

  return (
    <main id="contenido" className="min-h-screen bg-mist py-8 sm:py-12">
      <Container className="max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
          >
            <span aria-hidden="true">←</span> Ir al sitio
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AccountChip user={user} />
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-line bg-paper p-6 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">Tu espacio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
            Hola{user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Acá quedan las consultas que enviaste. Cada profesional decide cómo y cuándo responderte, y la
            conversación sigue por el canal que hayan acordado.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className={buttonStyles({ size: "lg" })} href="/profesionales">
              Buscar profesional
            </Link>
            <Link className={buttonStyles({ variant: "secondary", size: "lg" })} href="/preguntas-frecuentes">
              Cómo funciona
            </Link>
          </div>
        </div>

        <section className="mt-6 rounded-[2rem] border border-line bg-paper p-6 sm:p-9">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Tus consultas</h2>
            <p className="text-sm text-muted">Últimas 20</p>
          </div>

          {consultas.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-canvas p-10 text-center">
              <p className="font-semibold text-ink">Todavía no enviaste ninguna consulta.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                Cuando encuentres un perfil que te interese, escribile desde su página. La consulta te va a
                quedar registrada acá.
              </p>
              <Link className={`${buttonStyles()} mt-6`} href="/profesionales">
                Explorar perfiles
              </Link>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-line">
              {consultas.map((consulta) => {
                const profesional = consulta.professional_profiles;
                const nombre = profesional
                  ? `${profesional.first_name} ${profesional.last_name}`.trim()
                  : "Perfil no disponible";
                return (
                  <li key={consulta.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                    <div className="min-w-0">
                      {profesional ? (
                        <Link
                          className="font-semibold text-ink underline-offset-4 hover:underline"
                          href={`/profesionales/${profesional.slug}` as Route}
                        >
                          {nombre}
                        </Link>
                      ) : (
                        <p className="font-semibold text-ink">{nombre}</p>
                      )}
                      <p className="mt-1 text-sm text-muted">Enviada el {formatDate(consulta.created_at)}</p>
                    </div>
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-muted">
                      {ESTADOS[consulta.status] ?? "Enviada"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-line bg-paper p-6 sm:p-9">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">¿Atendés en salud mental?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Podés publicar tu perfil profesional con esta misma cuenta y empezar a recibir consultas.
            </p>
          </div>
          <Link className={buttonStyles({ variant: "secondary" })} href="/profesionales/sumarse">
            Publicar mi perfil
          </Link>
        </div>

        <form action={signOutAction} className="mt-6 text-center">
          <button className="min-h-11 px-3 text-sm font-semibold text-muted hover:text-ink" type="submit">
            Cerrar sesión
          </button>
        </form>
      </Container>
    </main>
  );
}
