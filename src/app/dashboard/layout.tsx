import Link from "next/link";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DashboardNavigation } from "@/components/dashboard/navigation";

import { signOutAction } from "@/app/(auth)/actions";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireCurrentUser } from "@/lib/dal/auth";

export const metadata: Metadata = {
  title: "Dashboard | Universo Psi",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser("/dashboard");

  return (
    <main id="contenido" className="min-h-screen bg-mist py-8 sm:py-12">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside>
            <div className="rounded-3xl border border-line bg-paper p-5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">Tu espacio</p>
                <ThemeToggle />
              </div>
              <Link
                href="/"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
              >
                <span aria-hidden="true">←</span> Ir al sitio
              </Link>
              <p className="mt-2 truncate font-semibold text-ink">{user.displayName ?? user.email ?? "Profesional"}</p>
              <Suspense><DashboardNavigation /></Suspense>
              {user.roles.some((role) => role === "ADMIN" || role === "SUPERADMIN") ? <Link href="/admin" className="mt-3 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-senda hover:bg-mist">Administrar perfiles</Link> : null}
              <form action={signOutAction} className="mt-6 border-t border-line pt-5">
                <button className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold text-muted hover:bg-mist hover:text-ink" type="submit">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </main>
  );
}
