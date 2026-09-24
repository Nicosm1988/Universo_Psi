import type { MetadataRoute } from "next";
import { publicRepository } from "@/lib/data/public-repository";

// El sitemap lee el catálogo, que cambia cuando se publica o se da de baja un
// perfil. Sin esto queda congelado en el build y sigue ofreciendo URLs muertas.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview") {
    return [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://universopsi.com";
  const professionalSlugs = await publicRepository.listProfessionalSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/profesionales`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/para-profesionales`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/planes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contacto`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terminos`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...professionalSlugs.map(({ slug }) => ({
      url: `${baseUrl}/profesionales/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
