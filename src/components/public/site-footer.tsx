import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/public/logo";

const footerGroups = [
  {
    title: "Encontrar",
    links: [
      ["Buscar profesionales", "/profesionales"],
      ["Recursos", "/recursos"],
      ["Convenios", "/convenios"],
    ],
  },
  {
    title: "Para profesionales",
    links: [
      ["Conocer la propuesta", "/para-profesionales"],
      ["Planes", "/planes"],
      ["Crear perfil", "/registro?next=/profesionales/sumarse"],
      ["Ingresar", "/ingresar"],
    ],
  },
  {
    title: "Universo Psi",
    links: [
      ["Cómo verificamos", "/para-profesionales#verificacion"],
      ["Privacidad", "/privacidad"],
      ["Términos", "/terminos"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink py-10 text-white sm:py-12">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo inverse />
            <p className="mt-5 text-sm leading-7 text-white/68">
              Una red para encontrar acompañamiento profesional con más claridad, criterio y confianza.
            </p>
            <p className="mt-4 text-xs leading-5 text-white/50">
              Universo Psi no realiza diagnósticos clínicos ni reemplaza atención de salud.
            </p>
          </div>
          <div className="grid gap-9 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-bold uppercase tracking-[0.13em] text-sand">{group.title}</h2>
                <ul className="mt-4 space-y-3 text-sm text-white/70">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <Link className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand motion-reduce:transition-none" href={href}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/12 pt-6 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Universo Psi. Hecho en Argentina.</p>
          <p>Decisiones profesionales, acompañadas por personas.</p>
        </div>
      </Container>
    </footer>
  );
}
