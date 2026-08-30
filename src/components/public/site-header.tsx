import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/public/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = [
  { href: "/profesionales", label: "Buscar profesional" },
  { href: "/recursos", label: "Recursos" },
  { href: "/convenios", label: "Convenios" },
  { href: "/para-profesionales", label: "Para profesionales" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 supports-[backdrop-filter]:bg-paper/90 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex min-h-20 items-center justify-between gap-2 sm:min-h-24 sm:gap-4">
        <Logo />
        <nav aria-label="Navegación principal" className="hidden items-center gap-0.5 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-2 text-[0.8rem] font-medium text-muted transition-colors hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 motion-reduce:transition-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 xl:flex">
          <ThemeToggle />
          <Link href="/ingresar" className={buttonStyles({ variant: "quiet", size: "sm" })}>
            Ingresar
          </Link>
          <Link href="/registro?next=/profesionales/sumarse" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Crear perfil
          </Link>
          <Link href="/profesionales" className={buttonStyles({ size: "sm" })}>
            Buscar profesional
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-1 min-[360px]:gap-2 xl:hidden">
          <ThemeToggle />
          <details className="mobile-nav relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line px-3 text-sm font-semibold text-ink min-[360px]:px-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35">
              Menú
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] w-[min(86vw,320px)] rounded-[1.1rem] border border-line bg-paper p-3 shadow-soft">
              <nav aria-label="Navegación móvil" className="flex flex-col">
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-mist">
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-line" />
                <Link href="/ingresar" className="rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-mist">
                  Ingresar
                </Link>
                <Link href="/registro?next=/profesionales/sumarse" className="rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-mist">
                  Crear perfil profesional
                </Link>
                <Link href="/profesionales" className={`${buttonStyles({ size: "sm" })} mt-2`}>
                  Buscar profesional
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
