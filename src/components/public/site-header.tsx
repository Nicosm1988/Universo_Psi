import Link from "next/link";
import { AccountChip } from "@/components/public/account-chip";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/public/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrimaryNavigation } from "@/components/public/primary-navigation";
import { getCurrentUser } from "@/lib/dal/auth";

export async function SiteHeader() {
  // Sólo hay cuenta del lado profesional: quien busca no necesita registrarse.
  // Por eso, sin sesión, la acción principal del encabezado es publicar perfil.
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 supports-[backdrop-filter]:bg-paper/90 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex min-h-20 items-center justify-between gap-2 sm:min-h-24 sm:gap-4">
        <Logo />
        <div className="ml-auto flex items-center gap-1 min-[360px]:gap-2 sm:gap-4">
          <ThemeToggle />
          <PrimaryNavigation />
          {user ? (
            <AccountChip user={user} />
          ) : (
            // `buttonStyles` ya fija `inline-flex`, que le gana a `hidden` en la
            // hoja: el ocultamiento por ancho va en el contenedor, no en el botón.
            <div className="hidden items-center gap-2 xl:flex">
              <Link href="/ingresar" className={buttonStyles({ variant: "quiet", size: "sm" })}>
                Ingresar
              </Link>
              <Link href="/registro?next=/profesionales/sumarse" className={buttonStyles({ size: "sm" })}>
                Publicar mi perfil
              </Link>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
