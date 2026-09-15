"use client";

import { BookOpen, LayoutDashboard, MessageSquareText, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const navigation = [
  { href: "/dashboard/seguridad", label: "Seguridad", icon: ShieldCheck, section: "seguridad" },
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, section: "" },
  { href: "/profesionales/sumarse", label: "Mi perfil", icon: UserRound, section: "perfil" },
  { href: "/dashboard?seccion=consultas", label: "Consultas", icon: MessageSquareText, section: "consultas" },
  { href: "/recursos", label: "Contenido", icon: BookOpen, section: "contenido" },
  { href: "/dashboard?seccion=suscripcion", label: "Suscripción", icon: Settings, section: "suscripcion" },
] as const;

export function DashboardNavigation() {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = pathname === "/dashboard/seguridad" ? "seguridad" : pathname.startsWith("/dashboard/suscripcion") ? "suscripcion" : ["consultas", "suscripcion"].includes(search.get("seccion") ?? "") ? search.get("seccion") : "";
  return <nav className="mt-6" aria-label="Dashboard">
    <ul className="space-y-1">
      {navigation.map(({ href, label, icon: Icon, section: itemSection }) => {
        const active = pathname.startsWith("/dashboard") && section === itemSection;
        return <li key={label}>
          <Link aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-mist hover:text-ink ${active ? "bg-mist text-ink" : "text-muted"}`} href={href}>
            <Icon className="size-4" aria-hidden="true" /> {label}
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
