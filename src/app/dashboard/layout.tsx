import { BookOpen, LayoutDashboard, MessageSquareText, Settings, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/(auth)/actions";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireCurrentUser } from "@/lib/dal/auth";

export const metadata: Metadata = {
  title: "Dashboard | Universo Psi",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/profesionales/sumarse", label: "Mi perfil", icon: UserRound },
  { href: "/dashboard#leads", label: "Consultas", icon: MessageSquareText },
  { href: "/dashboard#contenido", label: "Contenido", icon: BookOpen },
  { href: "/dashboard#suscripcion", label: "Suscripción", icon: Settings },
] as const;

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
              <p className="mt-2 truncate font-semibold text-ink">{user.displayName ?? user.email ?? "Profesional"}</p>
              <nav className="mt-6" aria-label="Dashboard">
                <ul className="space-y-1">
                  {navigation.map(({ href, label, icon: Icon }) => (
                    <li key={label}>
                      <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-mist hover:text-ink" href={href}>
                        <Icon className="size-4" aria-hidden="true" /> {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
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
