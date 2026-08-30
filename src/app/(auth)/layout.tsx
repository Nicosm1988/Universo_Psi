import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" className="min-h-screen bg-mist px-5 py-10 sm:py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            <span aria-hidden="true">←</span> Volver a Universo Psi
          </Link>
          <ThemeToggle />
        </div>
        <div className="rounded-[1.5rem] border border-line bg-paper p-6 shadow-soft sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
