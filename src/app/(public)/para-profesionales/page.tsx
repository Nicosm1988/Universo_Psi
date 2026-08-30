import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Sumarte como profesional",
  description: "Creá tu perfil como psicólogo/a o psicopedagogo/a, presentá tus credenciales y recibí consultas con contexto.",
  alternates: { canonical: "/para-profesionales" },
};

const productFeatures = [
  ["Perfil con profundidad", "Mostrá tu enfoque, experiencia, credenciales, modalidades y forma de trabajo en una página pensada para ser comprendida, no sólo recorrida."],
  ["Contactos con contexto", "Recibí consultas que incluyen el momento de la persona y su motivo. Menos mensajes genéricos, mejores primeras conversaciones."],
  ["Visibilidad legible", "Participá del buscador y del ecosistema editorial. Cualquier posición destacada se identifica: la confianza no se compra."],
  ["Métricas útiles", "Entendé visitas, contactos y evolución sin convertir tu práctica en una competencia permanente por números."],
  ["Convenios", "Postulate a programas de empresas, universidades y comunidades que se ajusten a tu experiencia y disponibilidad."],
  ["Red entre colegas", "Construimos las bases para derivaciones, encuentros y colaboración profesional con criterios compartidos."],
] as const;

export default function ForProfessionalsPage() {
  return (
    <>
      <PageHero
        eyebrow="Para profesionales"
        title="Una red que haga visible tu manera de acompañar."
        description="Universo Psi reúne profesionales de salud mental que acompañan procesos terapéuticos con credenciales revisadas."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Para profesionales" }]}
        actions={
          <>
            <Link href="/registro?next=/profesionales/sumarse" className={buttonStyles({ size: "lg" })}>Crear mi perfil profesional</Link>
            <Link href="/planes" className={buttonStyles({ variant: "secondary", size: "lg" })}>Conocer los planes</Link>
          </>
        }
        aside={
          <div className="rounded-[1.5rem] bg-ink p-6 text-white sm:p-7">
            <p className="font-display text-2xl font-semibold leading-tight tracking-[-0.025em]">Tu perfil no debería parecerse a una ficha técnica.</p>
            <p className="mt-4 text-sm leading-6 text-white/68">Queremos que una persona entienda cómo pensás, qué podés acompañar y qué puede esperar de una primera conversación.</p>
          </div>
        }
      />

      <section className="bg-paper py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <SectionHeading
              eyebrow="Una propuesta de valor honesta"
              title="Presencia, contexto y comunidad. Sin prometer resultados que nadie puede garantizar."
              description="Universo Psi no vende una cantidad asegurada de contactos. Construye las condiciones para que tu experiencia sea encontrada y comprendida por personas con necesidades compatibles."
            />
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["2", "disciplinas habilitadas: psicología y psicopedagogía"],
                ["100%", "de los destacados identificados"],
                ["1", "criterio de verificación por disciplina"],
                ["0", "diagnósticos automáticos u opacos"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.25rem] border border-line bg-canvas p-5">
                  <dt className="font-display text-3xl font-semibold tracking-[-0.035em] text-clay">{value}</dt>
                  <dd className="mt-2 text-xs leading-5 text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section className="bg-canvas py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading eyebrow="La plataforma" title="Herramientas pensadas para una práctica profesional sostenible." description="Empezamos por lo esencial y dejamos una base preparada para crecer con la red." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productFeatures.map(([title, description], index) => (
              <article key={title} className="rounded-[1.35rem] border border-line bg-paper p-6">
                <span className="text-xs font-bold text-clay">0{index + 1}</span>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="verificacion" className="scroll-mt-24 bg-senda-dark py-16 text-white sm:py-20 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <Badge tone="clay">Verificación profesional</Badge>
              <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-balance sm:text-5xl">Una red confiable necesita revisar, no sólo recopilar.</h2>
              <p className="mt-6 text-sm leading-6 text-white/68">La documentación permanece privada. El badge se publica únicamente cuando una persona autorizada completa la revisión correspondiente.</p>
            </div>
            <ol className="grid gap-3">
              {[
                ["01", "Identidad", "Validamos que la persona y los datos declarados sean consistentes."],
                ["02", "Regla aplicable", "Definimos qué evidencia corresponde según profesión, actividad y jurisdicción."],
                ["03", "Evidencia", "Revisamos matrícula, formación, certificación o trayectoria según el caso."],
                ["04", "Publicación", "Aprobamos el perfil y mostramos sólo información pública necesaria."],
              ].map(([number, title, description]) => (
                <li key={number} className="grid grid-cols-[3rem_1fr] gap-4 rounded-[1.15rem] border border-white/12 p-5">
                  <span className="font-display text-2xl font-semibold text-sand">{number}</span>
                  <div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/65">{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section className="bg-paper py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading eyebrow="Quiénes pueden sumarse" title="Distintas disciplinas, un estándar compartido de claridad y cuidado." description="La publicación está reservada a profesionales de salud mental con la documentación correspondiente." />
          <div className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:grid-cols-2">
            {[
              ["Psicología y Psiquiatría", "Profesionales que acompañan evaluación, diagnóstico y tratamiento de la salud mental."],
              ["Psicopedagogía y Educación especial", "Profesionales que acompañan procesos de aprendizaje y trayectorias con necesidades específicas."],
              ["Musicoterapia y Arteterapia", "Profesionales que acompañan procesos terapéuticos a través de intervenciones creativas."],
              ["Terapia ocupacional y Fonoaudiología", "Profesionales que acompañan rehabilitación, comunicación y habilidades para la vida diaria."],
              ["Terapia familiar sistémica y Trabajo social", "Profesionales que acompañan a la familia y su entorno social."],
              ["Acompañamiento terapéutico y Psicomotricidad", "Profesionales que acompañan consumos problemáticos y desarrollo psicomotor."],
            ].map(([title, description]) => (
              <article key={title} className="bg-canvas p-6 sm:p-7">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="sumarme" className="scroll-mt-24 bg-clay-soft py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay-dark">Convocatoria inicial</p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-ink text-balance sm:text-5xl">Si sos psicólogo/a o psicopedagogo/a, queremos conocerte.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted">La incorporación incluye un perfil en borrador, carga privada de documentación y revisión humana antes de publicar.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/registro?next=/profesionales/sumarse" className={buttonStyles({ size: "lg" })}>Crear mi perfil</Link>
              <Link href="/planes" className={buttonStyles({ variant: "secondary", size: "lg" })}>Comparar planes</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
