import type { ReactNode } from "react";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="border-b border-clay/20 bg-clay-soft px-5 py-2.5 text-center text-xs font-semibold leading-5 text-clay-dark">
        Versión piloto: los contenidos identificados como demo son ficticios y no representan personas reales.
      </div>
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
