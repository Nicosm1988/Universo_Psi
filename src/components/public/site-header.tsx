import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/public/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrimaryNavigation } from "@/components/public/primary-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 supports-[backdrop-filter]:bg-paper/90 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex min-h-20 items-center justify-between gap-2 sm:min-h-24 sm:gap-4">
        <Logo />
        <div className="ml-auto flex items-center gap-1 min-[360px]:gap-2 sm:gap-4">
          <ThemeToggle />
          <PrimaryNavigation />
          <div className="hidden xl:block">
            <Link href="/ingresar" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Ingresar
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
