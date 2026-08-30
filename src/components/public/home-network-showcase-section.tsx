import {
  HomeNetworkShowcase,
  type HomeShowcaseProfessional,
} from "@/components/public/home-network-showcase";
import { Container } from "@/components/ui/container";
import { publicRepository } from "@/lib/data/public-repository";

const ratingFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

async function getHomeShowcaseProfessionals(): Promise<HomeShowcaseProfessional[]> {
  try {
    const featuredProfessionals = await publicRepository.getFeaturedProfessionals(4);
    const professionals = await Promise.all(
      featuredProfessionals.map(async (professional) => {
        if (professional.testimonials.length > 0) return professional;
        return (await publicRepository.getProfessional(professional.slug)) ?? professional;
      }),
    );

    return professionals.map((professional) => {
      const reviewLabel = `${professional.reviewCount} ${professional.reviewCount === 1 ? "opinión" : "opiniones"}`;
      const modalities = professional.modalities
        .map((modality) => (modality === "online" ? "Online" : "Presencial"))
        .join(" · ");

      return {
        slug: professional.slug,
        name: professional.name,
        initials: professional.initials,
        role: professional.role,
        headline: professional.headline,
        locationAndModality: [modalities, professional.city].filter(Boolean).join(" · "),
        availabilityLabel: professional.availabilityLabel,
        ratingAndReviews: `${ratingFormatter.format(professional.rating)} · ${reviewLabel}`,
        verified: professional.verified,
        isDemo: professional.isDemo === true,
        testimonial: professional.testimonials[0],
      };
    });
  } catch {
    return [];
  }
}

export async function HomeNetworkShowcaseSection() {
  const professionals = await getHomeShowcaseProfessionals();
  return <HomeNetworkShowcase professionals={professionals} />;
}

export function HomeNetworkShowcaseFallback() {
  return (
    <section aria-label="Cargando profesionales de Universo Psi" className="border-y border-line bg-canvas py-8 sm:py-10">
      <Container>
        <div className="mx-auto grid max-w-[1240px] gap-6 lg:min-h-[330px] lg:grid-cols-[minmax(250px,.62fr)_minmax(0,1.38fr)]">
          <div className="rounded-[1.35rem] bg-ink p-6 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-sand">Qué es Universo Psi</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.035em] text-balance">
              Una red para elegir acompañamiento con más claridad.
            </h2>
          </div>
          <div className="flex min-h-[180px] items-center rounded-[1.35rem] border border-line bg-paper p-6 lg:min-h-[250px]">
            <p role="status" className="text-sm text-muted">Cargando profesionales…</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
