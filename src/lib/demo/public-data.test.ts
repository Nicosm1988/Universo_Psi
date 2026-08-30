import { describe, expect, it } from "vitest";

import { publicRepository } from "./public-data";

describe("public professional repository", () => {
  it("finds professionals with accent-insensitive text search", async () => {
    const results = await publicRepository.listProfessionals({ q: "ines" });

    expect(results.map(({ slug }) => slug)).toContain("ines-moreno");
  });

  it("combines filter dimensions while allowing alternatives in one dimension", async () => {
    const results = await publicRepository.listProfessionals({
      need: ["ansiedad", "estres-y-agotamiento"],
      modality: ["online"],
      language: ["ingles"],
      verified: true,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const professional of results) {
      expect(
        professional.needs.some((need) =>
          ["ansiedad", "estres-y-agotamiento"].includes(need),
        ),
      ).toBe(true);
      expect(professional.modalities).toContain("online");
      expect(professional.languages).toContain("ingles");
      expect(professional.verified).toBe(true);
    }
  });

  it("publishes only active mental health professional types without fees or numeric seniority", async () => {
    const results = await publicRepository.listProfessionals();

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((professional) =>
        [
          "psicologia",
          "psicopedagogia",
          "psiquiatria",
          "musicoterapia",
          "terapia-ocupacional",
        ].includes(professional.professionalType),
      ),
    ).toBe(true);
    expect(
      results.every(
        (professional) =>
          !("priceFrom" in professional) &&
          !("currency" in professional) &&
          !("showPrice" in professional) &&
          !("yearsExperience" in professional) &&
          professional.experience.every((item) => !("period" in item)),
      ),
    ).toBe(true);
  });

  it("orders availability from the nearest open slot", async () => {
    const results = await publicRepository.listProfessionals({
      sort: "availability",
    });
    const availability = results.map(({ availabilityOrder }) =>
      availabilityOrder,
    );

    expect(availability).toEqual([...availability].sort((a, b) => a - b));
  });

  it("ranks matching professional types ahead of unrelated profiles", async () => {
    const results = await publicRepository.listProfessionals({
      need: ["dificultades-de-aprendizaje"],
      type: ["psicopedagogia"],
      modality: ["online"],
      sort: "match",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      professionalType: "psicopedagogia",
    });
  });

  it("returns stable detail records and null for unknown slugs", async () => {
    await expect(
      publicRepository.getProfessional("valentina-acosta"),
    ).resolves.toMatchObject({
      id: "11111111-1111-4111-8111-111111111101",
      name: "Valentina Acosta",
      verified: true,
    });
    await expect(
      publicRepository.getProfessional("perfil-inexistente"),
    ).resolves.toBeNull();
  });
});

describe("public SEO collections", () => {
  it("exposes unique slugs for every indexable collection", async () => {
    const [professionals, resources, agreements] = await Promise.all([
      publicRepository.listProfessionalSlugs(),
      publicRepository.listResourceSlugs(),
      publicRepository.listAgreementSlugs(),
    ]);

    for (const collection of [professionals, resources, agreements]) {
      const slugs = collection.map(({ slug }) => slug);
      expect(slugs.length).toBeGreaterThan(0);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(
        true,
      );
    }
  });

  it("lists resources newest first and resolves public details", async () => {
    const resources = await publicRepository.listResources();
    const publishedAt = resources.map(({ publishedAt }) => publishedAt);

    expect(publishedAt).toEqual([...publishedAt].sort().reverse());
    await expect(
      publicRepository.getResource(resources[0]?.slug ?? ""),
    ).resolves.toEqual(resources[0]);
    await expect(
      publicRepository.getAgreement("comunidad-universitaria-del-rio"),
    ).resolves.toMatchObject({ institution: "Universidad del Río" });
  });
});
