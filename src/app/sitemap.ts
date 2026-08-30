import type { MetadataRoute } from "next";
import { publicRepository } from "@/lib/data/public-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://universo-psi.vercel.app";
  const [professionalSlugs, resourceSlugs, agreementSlugs] = await Promise.all([
    publicRepository.listProfessionalSlugs(),
    publicRepository.listResourceSlugs(),
    publicRepository.listAgreementSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/profesionales`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/recursos`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/convenios`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/para-profesionales`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/planes`, changeFrequency: "monthly", priority: 0.6 },
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
    ...resourceSlugs.map(({ slug }) => ({
      url: `${baseUrl}/recursos/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...agreementSlugs.map(({ slug }) => ({
      url: `${baseUrl}/convenios/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
