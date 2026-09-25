"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

const navigation = [
  { href: "/profesionales", label: "Buscar profesional" },
  { href: "/para-profesionales", label: "Soy profesional" },
  { href: "/preguntas-frecuentes", label: "Ayuda" },
] as const;

export function PrimaryNavigation() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  function closeMenu(returnFocus = false) {
    if (menu.current) menu.current.open = false;
    if (returnFocus) trigger.current?.focus();
  }

  const links = navigation.map(({ href, label }) => {
    const active = href === "/para-profesionales"
      ? ["/para-profesionales", "/planes", "/profesionales/sumarse"].includes(pathname)
      : (pathname === href || pathname.startsWith(`${href}/`)) && pathname !== "/profesionales/sumarse";
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined}
        onNavigate={() => closeMenu()}
        className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda motion-reduce:transition-none ${active ? "bg-senda-soft text-senda-dark" : "text-ink"}`}>
        {label}
      </Link>
    );
  });

  return (
    <>
      <nav aria-label="Navegación principal" className="hidden items-center gap-1 xl:flex">{links}</nav>
      <details ref={menu} className="mobile-nav relative xl:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current?.open) {
            event.preventDefault();
            closeMenu(true);
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
        }}>
        <summary ref={trigger} className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line px-3 text-sm font-semibold text-ink min-[360px]:px-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda">Menú</summary>
        <nav aria-label="Navegación móvil" className="absolute right-0 top-[calc(100%+10px)] flex max-h-[calc(100dvh-7rem)] w-[min(86vw,320px)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-paper p-3 shadow-soft">
          {links}
          <div className="my-1 border-t border-line" />
          <Link href="/registro?next=/profesionales/sumarse" onNavigate={() => closeMenu()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-3 text-sm font-semibold text-white hover:bg-senda">Publicar mi perfil</Link>
          <Link href="/planes" onNavigate={() => closeMenu()} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-mist">Ver planes profesionales</Link>
          <Link href="/ingresar" onNavigate={() => closeMenu()} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-mist">Ingresar</Link>
        </nav>
      </details>
    </>
  );
}
