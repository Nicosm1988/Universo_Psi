import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { cache } from "react";

import { publicEnv } from "@/lib/env/public";
import {
  publicRepository as demoRepository,
  type Agreement,
  type Modality,
  type Plan,
  type Professional,
  type ProfessionalFilters,
  type ResourceArticle,
} from "@/lib/demo/public-data";

type TaxonomyEntry = {
  id: string;
  code?: string;
  slug?: string;
  name: string;
  full_name?: string;
  country_code?: string;
  kind?: string;
};

type Taxonomies = {
  professionalTypes: TaxonomyEntry[];
  needs: TaxonomyEntry[];
  services: TaxonomyEntry[];
  specialties: TaxonomyEntry[];
  audiences: TaxonomyEntry[];
  modalities: TaxonomyEntry[];
  locations: TaxonomyEntry[];
  languages: TaxonomyEntry[];
  industries: TaxonomyEntry[];
  careerStages: TaxonomyEntry[];
};

type DirectoryRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  display_name: string;
  headline: string;
  bio: string;
  approach: string | null;
  experience_summary: string | null;
  education_summary: string | null;
  availability_status: string;
  next_available_on: string | null;
  availability_note: string | null;
  verification_state: string;
  is_accepting_leads: boolean;
  is_demo: boolean;
  professional_type_ids: string[];
  need_ids: string[];
  service_ids: string[];
  specialty_ids: string[];
  audience_ids: string[];
  modality_ids: string[];
  location_ids: string[];
  language_ids: string[];
  industry_ids: string[];
  career_stage_ids: string[];
  review_rating: number | string;
  review_count: number | string;
};

type RankedRow = {
  professional_profile_id: string;
  is_sponsored: boolean;
};

const directoryColumns = [
  "id",
  "slug",
  "first_name",
  "last_name",
  "display_name",
  "headline",
  "bio",
  "approach",
  "experience_summary",
  "education_summary",
  "availability_status",
  "next_available_on",
  "availability_note",
  "verification_state",
  "is_accepting_leads",
  "is_demo",
  "professional_type_ids",
  "need_ids",
  "service_ids",
  "specialty_ids",
  "audience_ids",
  "modality_ids",
  "location_ids",
  "language_ids",
  "industry_ids",
  "career_stage_ids",
  "review_rating",
  "review_count",
].join(",");

const needGroups: Record<string, string> = {
  anxiety: "ansiedad",
  mood_depression: "animo-y-depresion",
  grief: "duelo",
  stress_burnout: "estres-y-agotamiento",
  self_esteem: "autoestima",
  couple_relationship: "relacion-de-pareja",
  learning_difficulties: "dificultades-de-aprendizaje",
  trauma: "trauma",
  family_conflict: "conflictos-familiares",
  life_transitions: "transiciones-vitales",
};

function idsBySlug(entries: TaxonomyEntry[], slugs: string[] | undefined) {
  if (!slugs?.length) return [];
  const wanted = new Set(slugs);
  return entries.filter((entry) => entry.slug && wanted.has(entry.slug)).map((entry) => entry.id);
}

function hasOnlySupportedProfessionalTypes(
  row: Pick<DirectoryRow, "professional_type_ids">,
  taxonomies: Taxonomies,
) {
  const supportedIds = new Set(taxonomies.professionalTypes.map((entry) => entry.id));
  return (
    row.professional_type_ids.length > 0 &&
    row.professional_type_ids.every((id) => supportedIds.has(id))
  );
}

function rankingSearchSignature(filters: ProfessionalFilters) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        language: filters.language ?? [],
        location: filters.location ?? [],
        modality: filters.modality ?? [],
        need: filters.need ?? [],
        q: filters.q?.trim() ?? "",
        type: filters.type ?? [],
      }),
    )
    .digest("hex");
}

const languageGroups: Record<string, string> = {
  es: "espanol",
  en: "ingles",
  pt: "portugues",
};

function shouldUseDemoData() {
  return (
    process.env.UNIVERSO_PSI_TEST_MODE === "true" ||
    publicEnv.NEXT_PUBLIC_SUPABASE_URL.includes("example.supabase.co")
  );
}

function createPublicClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

const getTaxonomies = cache(async (): Promise<Taxonomies> => {
  const supabase = createPublicClient();
  const [
    professionalTypes,
    needs,
    services,
    specialties,
    audiences,
    modalities,
    locations,
    languages,
    industries,
    careerStages,
  ] = await Promise.all([
    supabase
      .from("professional_types")
      .select("id,code,slug,name")
      .eq("is_active", true),
    supabase.from("needs").select("id,code,slug,name").eq("is_active", true),
    supabase.from("services").select("id,code,slug,name").eq("is_active", true),
    supabase.from("specialties").select("id,code,slug,name").eq("is_active", true),
    supabase.from("audiences").select("id,code,name").eq("is_active", true),
    supabase.from("modalities").select("id,code,name").eq("is_active", true),
    supabase.from("locations").select("id,slug,name,full_name,country_code,kind").eq("is_active", true),
    supabase.from("languages").select("id,code,name").eq("is_active", true),
    supabase.from("industries").select("id,code,slug,name").eq("is_active", true),
    supabase.from("career_stages").select("id,code,slug,name").eq("is_active", true),
  ]);

  const firstError = [
    professionalTypes.error,
    needs.error,
    services.error,
    specialties.error,
    audiences.error,
    modalities.error,
    locations.error,
    languages.error,
    industries.error,
    careerStages.error,
  ].find(Boolean);
  if (firstError) {
    throw new Error("No se pudieron cargar las taxonomías públicas.", {
      cause: firstError,
    });
  }

  return {
    professionalTypes: (professionalTypes.data ?? []) as TaxonomyEntry[],
    needs: (needs.data ?? []) as TaxonomyEntry[],
    services: (services.data ?? []) as TaxonomyEntry[],
    specialties: (specialties.data ?? []) as TaxonomyEntry[],
    audiences: (audiences.data ?? []) as TaxonomyEntry[],
    modalities: (modalities.data ?? []) as TaxonomyEntry[],
    locations: (locations.data ?? []) as TaxonomyEntry[],
    languages: (languages.data ?? []) as TaxonomyEntry[],
    industries: (industries.data ?? []) as TaxonomyEntry[],
    careerStages: (careerStages.data ?? []) as TaxonomyEntry[],
  };
});

function entriesForIds(entries: TaxonomyEntry[], ids: string[]) {
  const wanted = new Set(ids);
  return entries.filter((entry) => wanted.has(entry.id));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function idsForGroups(
  entries: TaxonomyEntry[],
  groups: string[] | undefined,
  mapping: Record<string, string>,
) {
  if (!groups?.length) return [];
  const wanted = new Set(groups);
  return entries
    .filter((entry) => {
      if (!entry.code) return false;
      const group = mapping[entry.code];
      return group ? wanted.has(group) : false;
    })
    .map((entry) => entry.id);
}

function modalityIds(entries: TaxonomyEntry[], filters?: string[]) {
  if (!filters?.length) return [];
  const wanted = new Set(filters);
  return entries
    .filter((entry) => {
      if (entry.code === "HYBRID") {
        return wanted.has("online") || wanted.has("presencial");
      }
      return (
        (entry.code === "ONLINE" && wanted.has("online")) ||
        (entry.code === "IN_PERSON" && wanted.has("presencial")) ||
        (entry.code === "HOME_VISIT" && wanted.has("a_domicilio"))
      );
    })
    .map((entry) => entry.id);
}

function locationIds(entries: TaxonomyEntry[], filters?: string[]) {
  if (!filters?.length) return [];
  return entries
    .filter((entry) => {
      const search = `${entry.slug ?? ""} ${entry.full_name ?? entry.name}`.toLocaleLowerCase("es");
      return filters.some((filter) => {
        if (filter === "caba") return search.includes("caba") || entry.id.endsWith("101");
        if (filter === "cordoba") return search.includes("córdoba") || search.includes("cordoba");
        if (filter === "mendoza") return search.includes("mendoza");
        if (filter === "rosario") return search.includes("rosario");
        return entry.slug === filter;
      });
    })
    .map((entry) => entry.id);
}

function availability(row: DirectoryRow) {
  if (row.availability_note) return row.availability_note;
  if (row.next_available_on) {
    const date = new Date(`${row.next_available_on}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return `Próximo espacio: ${new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
      }).format(date)}`;
    }
  }
  if (row.availability_status === "AVAILABLE") return "Con disponibilidad";
  if (row.availability_status === "LIMITED") return "Cupos limitados";
  if (row.availability_status === "WAITLIST") return "Lista de espera";
  return "Disponibilidad a consultar";
}

function availabilityOrder(status: string) {
  if (status === "AVAILABLE") return 1;
  if (status === "LIMITED") return 2;
  if (status === "ASK") return 4;
  return 5;
}

function locationKey(location?: TaxonomyEntry) {
  const value = `${location?.slug ?? ""} ${location?.full_name ?? ""}`.toLocaleLowerCase("es");
  if (value.includes("caba") || location?.id.endsWith("101")) return "caba";
  if (value.includes("córdoba") || value.includes("cordoba")) return "cordoba";
  if (value.includes("mendoza")) return "mendoza";
  if (value.includes("rosario")) return "rosario";
  return location?.slug ?? "online";
}

function sentences(value: string | null, fallback: string) {
  const items = (value ?? "")
    .split(/(?:\r?\n|(?<=[.!?])\s+)/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .slice(0, 3);
  return items.length ? items : [fallback];
}

function toProfessional(
  row: DirectoryRow,
  taxonomies: Taxonomies,
  sponsored: boolean,
  demo?: Professional,
): Professional {
  const types = entriesForIds(taxonomies.professionalTypes, row.professional_type_ids);
  const needs = entriesForIds(taxonomies.needs, row.need_ids);
  const services = entriesForIds(taxonomies.services, row.service_ids);
  const specialties = entriesForIds(taxonomies.specialties, row.specialty_ids);
  const audiences = entriesForIds(taxonomies.audiences, row.audience_ids);
  const modalities = entriesForIds(taxonomies.modalities, row.modality_ids);
  const locations = entriesForIds(taxonomies.locations, row.location_ids);
  const languages = entriesForIds(taxonomies.languages, row.language_ids);
  const industries = entriesForIds(taxonomies.industries, row.industry_ids);
  const stages = entriesForIds(taxonomies.careerStages, row.career_stage_ids);
  const primaryType = types[0];
  const primaryLocation = locations.find((entry) => entry.kind === "CITY") ?? locations[0];
  const name = row.display_name || `${row.first_name} ${row.last_name}`.trim();
  const editorialDemo = row.is_demo ? demo : undefined;
  const verified = row.verification_state === "VERIFIED";

  return {
    id: row.id,
    slug: row.slug,
    name,
    initials: name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
      .join(""),
    role: editorialDemo?.role ?? primaryType?.name ?? "Profesional de trayectoria y carrera",
    credential: verified ? "Credenciales revisadas" : "Verificación en curso",
    headline: row.headline,
    about: row.bio,
    needs: unique(
      needs.flatMap((entry) => {
        const group = entry.code ? needGroups[entry.code] : undefined;
        return group ? [group] : [];
      }),
    ),
    contactNeeds: needs.map((entry) => ({ id: entry.id, label: entry.name })),
    professionalType: primaryType?.slug ?? "psicologia",
    specialties: specialties.map((entry) => entry.name),
    modalities: unique<Modality>(
      modalities.flatMap((entry) => {
        if (entry.code === "HYBRID") return ["online", "presencial"] as const;
        if (entry.code === "ONLINE") return ["online"] as const;
        if (entry.code === "IN_PERSON") return ["presencial"] as const;
        if (entry.code === "HOME_VISIT") return ["a_domicilio"] as const;
        return [];
      }),
    ),
    city: primaryLocation?.name ?? "Atención online",
    province: locationKey(primaryLocation),
    country: primaryLocation?.country_code === "AR" ? "Argentina" : primaryLocation?.country_code ?? "Argentina",
    languages: unique(
      languages.flatMap((entry) => {
        const group = entry.code ? languageGroups[entry.code] : undefined;
        return group ? [group] : [];
      }),
    ),
    audiences: audiences.map((entry) => entry.name),
    careerStages: stages.map((entry) => entry.name),
    industries: industries.map((entry) => entry.name),
    serviceTypes: services.map((entry) => entry.name),
    agreementSlugs: editorialDemo?.agreementSlugs ?? [],
    verified,
    featured: sponsored,
    isDemo: row.is_demo,
    acceptingLeads: row.is_accepting_leads,
    availabilityOrder: availabilityOrder(row.availability_status),
    availabilityLabel: availability(row),
    rating: Number(row.review_rating),
    reviewCount: Number(row.review_count),
    workingStyle:
      editorialDemo?.workingStyle ??
      sentences(row.approach, "Acordamos objetivos y una forma de trabajo antes de comenzar."),
    experience:
      editorialDemo?.experience ?? [
        {
          role: "Experiencia relevante",
          organization: row.experience_summary ?? "Trayectoria informada en el perfil.",
        },
      ],
    education:
      editorialDemo?.education ?? [
        {
          title: "Formación declarada",
          institution: row.education_summary ?? "Información disponible durante la consulta.",
        },
      ],
    credentials:
      editorialDemo?.credentials ??
      (verified
        ? ["Identidad y credenciales vigentes revisadas por Universo Psi"]
        : ["Documentación pendiente o en proceso de revisión"]),
    testimonials: editorialDemo?.testimonials ?? [],
  };
}

async function listDatabaseProfessionals(filters: ProfessionalFilters = {}) {
  const taxonomies = await getTaxonomies();
  const supabase = createPublicClient();
  const needIds = idsForGroups(taxonomies.needs, filters.need, needGroups);
  const selectedTypeIds = idsBySlug(taxonomies.professionalTypes, filters.type);
  const typeIds = selectedTypeIds.length
    ? selectedTypeIds
    : taxonomies.professionalTypes.map((entry) => entry.id);
  const selectedModalityIds = modalityIds(taxonomies.modalities, filters.modality);
  const selectedLocationIds = locationIds(taxonomies.locations, filters.location);
  const selectedLanguageIds = idsForGroups(
    taxonomies.languages,
    filters.language,
    languageGroups,
  );

  const { data: rankedData, error: rankingError } = await supabase.rpc(
    "rank_professionals",
    {
      p_need_ids: needIds,
      p_professional_type_ids: typeIds,
      p_service_ids: [],
      p_specialty_ids: [],
      p_audience_ids: [],
      p_modality_ids: selectedModalityIds,
      p_location_ids: selectedLocationIds,
      p_language_ids: selectedLanguageIds,
      p_industry_ids: [],
      p_career_stage_ids: [],
      p_search: filters.q?.trim() || null,
      p_search_signature: rankingSearchSignature(filters),
      p_limit: 50,
    },
  );
  if (rankingError) {
    throw new Error("No se pudo ordenar el directorio profesional.", {
      cause: rankingError,
    });
  }

  const ranked = (rankedData ?? []) as RankedRow[];
  if (!ranked.length) return [];
  const ids = ranked.map((item) => item.professional_profile_id);
  const { data: directoryData, error: directoryError } = await supabase
    .from("professional_directory")
    .select(directoryColumns)
    .in("id", ids);
  if (directoryError) {
    throw new Error("No se pudo cargar el directorio profesional.", {
      cause: directoryError,
    });
  }

  const directory = (directoryData ?? []) as unknown as DirectoryRow[];
  const rankIndex = new Map(ids.map((id, index) => [id, index]));
  const sponsored = new Map(
    ranked.map((item) => [item.professional_profile_id, item.is_sponsored]),
  );
  const demoProfessionals = await demoRepository.listProfessionals();
  const demoBySlug = new Map(demoProfessionals.map((item) => [item.slug, item]));
  const professionals = directory
    .filter((row) => hasOnlySupportedProfessionalTypes(row, taxonomies))
    .map((row) =>
      toProfessional(
        row,
        taxonomies,
        sponsored.get(row.id) ?? false,
        demoBySlug.get(row.slug),
      ),
    )
    .filter((professional) => !filters.verified || professional.verified)
    .sort((a, b) => (rankIndex.get(a.id) ?? 999) - (rankIndex.get(b.id) ?? 999));

  if (filters.sort === "availability") {
    professionals.sort((a, b) => a.availabilityOrder - b.availabilityOrder);
  } else if (filters.sort === "recommended") {
    professionals.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
  } else if (filters.sort === "featured") {
    professionals.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  }

  return professionals;
}

async function getDatabaseProfessional(slug: string) {
  const supabase = createPublicClient();
  const taxonomies = await getTaxonomies();
  const { data: directoryData, error: directoryError } = await supabase
    .from("professional_directory")
    .select(directoryColumns)
    .eq("slug", slug)
    .maybeSingle();
  if (directoryError) {
    throw new Error("No se pudo cargar el perfil profesional.", {
      cause: directoryError,
    });
  }
  if (!directoryData) return null;

  const row = directoryData as unknown as DirectoryRow;
  if (!hasOnlySupportedProfessionalTypes(row, taxonomies)) return null;
  const [{ data: signal, error: signalError }, demoProfessionals] = await Promise.all([
    supabase
      .from("professional_ranking_signals")
      .select("is_sponsored")
      .eq("professional_profile_id", row.id)
      .maybeSingle(),
    demoRepository.listProfessionals(),
  ]);
  if (signalError) {
    throw new Error("No se pudo cargar el estado de visibilidad del perfil.", {
      cause: signalError,
    });
  }
  const demo = demoProfessionals.find((item) => item.slug === row.slug);
  const professional = toProfessional(
    row,
    taxonomies,
    signal?.is_sponsored ?? false,
    demo,
  );

  const { data, error } = await supabase
    .from("reviews")
    .select("reviewer_display_name,title,body")
    .eq("professional_profile_id", professional.id)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    throw new Error("No se pudieron cargar las opiniones públicas.", {
      cause: error,
    });
  }

  return {
    ...professional,
    testimonials: (data ?? []).map((review) => ({
      quote: review.body,
      author: review.reviewer_display_name,
      context: review.title ?? "Experiencia en Universo Psi",
    })),
  };
}

async function listDatabasePlans(): Promise<Plan[]> {
  const supabase = createPublicClient();
  const [{ data, error }, configuredPlans] = await Promise.all([
    supabase
      .from("plans")
      .select("code,name,description,price_amount,currency,pricing_status")
      .eq("is_active", true)
      .order("sort_order"),
    demoRepository.listPlans(),
  ]);
  if (error) {
    throw new Error("No se pudieron cargar los planes.", { cause: error });
  }

  const configuredByCode = new Map(
    configuredPlans.map((plan) => [plan.slug.toLocaleUpperCase("es"), plan]),
  );
  return (data ?? []).flatMap((row) => {
    const configured = configuredByCode.get(row.code);
    if (!configured || row.currency !== "ARS") return [];
    const amount = row.price_amount === null ? null : Number(row.price_amount);
    return [
      {
        ...configured,
        name: row.name,
        description: row.description ?? configured.description,
        monthlyPrice:
          row.pricing_status === "PUBLISHED" && amount !== null && Number.isFinite(amount)
            ? amount
            : null,
      },
    ];
  });
}

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  takeaways: string[];
  category_id: string | null;
  author_profile_id: string | null;
  published_at: string;
  is_demo: boolean;
};

type ArticleCategoryRow = { id: string; name: string };

type ArticleAuthorRow = { id: string; slug: string; display_name: string; headline: string };

type AgreementRow = {
  id: string;
  institution_id: string;
  slug: string;
  name: string;
  summary: string;
  modality_notes: string | null;
  audience_summary: string | null;
  coverage_summary: string | null;
  benefits: string[];
  eligibility: string[];
  access_steps: string[];
  valid_from: string | null;
  valid_until: string | null;
  is_demo: boolean;
};

type InstitutionRow = { id: string; name: string; institution_type: string };

type AgreementServiceRow = { agreement_id: string; service_id: string };

type AgreementProfessionalRow = { agreement_id: string };

const agreementKindLabels: Record<string, string> = {
  UNIVERSITY: "Convenio educativo",
  COMPANY: "Convenio corporativo",
  ASSOCIATION: "Convenio con asociación",
  COMMUNITY: "Convenio comunitario",
  MUTUAL: "Convenio con mutual",
  OTHER: "Convenio institucional",
};

const validityFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
    .join("");
}

function parseArticleBody(body: string) {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n(?=##\s)/);
  const lead = (blocks[0] ?? "").trim();
  const sections = blocks.slice(1).map((block) => {
    const lines = block.trim().split("\n");
    const heading = (lines[0] ?? "").replace(/^##\s+/, "").trim();
    const paragraphs = lines
      .slice(1)
      .join("\n")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    return { heading, paragraphs };
  });
  return { lead, sections };
}

function estimateReadingTime(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

function formatValidity(validFrom: string | null, validUntil: string | null) {
  const from = validFrom ? validityFormatter.format(new Date(`${validFrom}T12:00:00Z`)) : null;
  const until = validUntil ? validityFormatter.format(new Date(`${validUntil}T12:00:00Z`)) : null;
  if (from && until) return `Vigente desde ${from} hasta ${until}.`;
  if (from) return `Vigente desde ${from}.`;
  if (until) return `Vigente hasta ${until}.`;
  return "Vigencia continua mientras el convenio esté publicado.";
}

async function buildArticles(rows: ArticleRow[]): Promise<ResourceArticle[]> {
  if (!rows.length) return [];
  const supabase = createPublicClient();
  const categoryIds = unique(rows.flatMap((row) => (row.category_id ? [row.category_id] : [])));
  const authorIds = unique(rows.flatMap((row) => (row.author_profile_id ? [row.author_profile_id] : [])));
  const [{ data: categories, error: categoriesError }, { data: authors, error: authorsError }] = await Promise.all([
    categoryIds.length
      ? supabase.from("article_categories").select("id,name").in("id", categoryIds)
      : Promise.resolve({ data: [] as ArticleCategoryRow[], error: null }),
    authorIds.length
      ? supabase.from("professional_directory").select("id,slug,display_name,headline").in("id", authorIds)
      : Promise.resolve({ data: [] as ArticleAuthorRow[], error: null }),
  ]);
  if (categoriesError || authorsError) {
    throw new Error("No se pudieron cargar los recursos publicados.", {
      cause: categoriesError ?? authorsError,
    });
  }

  const categoryById = new Map((categories ?? []).map((entry) => [entry.id, entry.name]));
  const authorById = new Map((authors ?? []).map((entry) => [entry.id, entry]));

  return rows.map((row) => {
    const { lead, sections } = parseArticleBody(row.body);
    const category = (row.category_id && categoryById.get(row.category_id)) || "Recursos";
    const author = row.author_profile_id ? authorById.get(row.author_profile_id) : undefined;
    return {
      slug: row.slug,
      title: row.title,
      eyebrow: category,
      excerpt: row.excerpt,
      category,
      publishedAt: row.published_at,
      readingTime: estimateReadingTime(row.body),
      author: author?.display_name ?? "Equipo Universo Psi",
      authorRole: author?.headline ?? "Redacción editorial",
      professionalSlug: author?.slug,
      lead,
      sections,
      takeaways: row.takeaways,
      isDemo: row.is_demo,
    };
  });
}

async function listDatabaseResources(): Promise<ResourceArticle[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,excerpt,body,tags,takeaways,category_id,author_profile_id,published_at,is_demo")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });
  if (error) {
    throw new Error("No se pudieron cargar los recursos publicados.", { cause: error });
  }
  return buildArticles((data ?? []) as ArticleRow[]);
}

async function getDatabaseResource(slug: string): Promise<ResourceArticle | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,excerpt,body,tags,takeaways,category_id,author_profile_id,published_at,is_demo")
    .eq("status", "PUBLISHED")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error("No se pudo cargar el recurso solicitado.", { cause: error });
  }
  if (!data) return null;
  const [article] = await buildArticles([data as ArticleRow]);
  return article ?? null;
}

async function listDatabaseResourceSlugs() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });
  if (error) {
    throw new Error("No se pudieron cargar las rutas de recursos.", { cause: error });
  }
  return (data ?? []) as Array<{ slug: string }>;
}

async function buildAgreements(rows: AgreementRow[]): Promise<Agreement[]> {
  if (!rows.length) return [];
  const supabase = createPublicClient();
  const institutionIds = unique(rows.map((row) => row.institution_id));
  const agreementIds = rows.map((row) => row.id);
  const [
    { data: institutions, error: institutionsError },
    { data: agreementServices, error: agreementServicesError },
    { data: activeMembers, error: activeMembersError },
  ] = await Promise.all([
    supabase.from("institutions").select("id,name,institution_type").in("id", institutionIds).eq("is_active", true),
    supabase.from("agreement_services").select("agreement_id,service_id").in("agreement_id", agreementIds),
    supabase.from("agreement_professionals").select("agreement_id").in("agreement_id", agreementIds).eq("status", "ACTIVE"),
  ]);
  if (institutionsError || agreementServicesError || activeMembersError) {
    throw new Error("No se pudieron cargar los convenios publicados.", {
      cause: institutionsError ?? agreementServicesError ?? activeMembersError,
    });
  }

  const serviceIds = unique((agreementServices ?? []).map((entry) => entry.service_id));
  const { data: services, error: servicesError } = serviceIds.length
    ? await supabase.from("services").select("id,name").in("id", serviceIds)
    : { data: [] as Array<{ id: string; name: string }>, error: null };
  if (servicesError) {
    throw new Error("No se pudieron cargar los servicios del convenio.", { cause: servicesError });
  }

  const institutionById = new Map((institutions ?? []).map((entry) => [entry.id, entry as InstitutionRow]));
  const serviceNameById = new Map((services ?? []).map((entry) => [entry.id, entry.name]));
  const servicesByAgreement = new Map<string, string[]>();
  for (const entry of (agreementServices ?? []) as AgreementServiceRow[]) {
    const name = serviceNameById.get(entry.service_id);
    if (!name) continue;
    const list = servicesByAgreement.get(entry.agreement_id) ?? [];
    list.push(name);
    servicesByAgreement.set(entry.agreement_id, list);
  }
  const memberCountByAgreement = new Map<string, number>();
  for (const entry of (activeMembers ?? []) as AgreementProfessionalRow[]) {
    memberCountByAgreement.set(entry.agreement_id, (memberCountByAgreement.get(entry.agreement_id) ?? 0) + 1);
  }

  return rows.flatMap((row) => {
    const institution = institutionById.get(row.institution_id);
    if (!institution) return [];
    return [
      {
        slug: row.slug,
        institution: institution.name,
        institutionInitials: initialsFrom(institution.name),
        kind: agreementKindLabels[institution.institution_type] ?? "Convenio institucional",
        title: row.name,
        excerpt: row.summary,
        audience: row.audience_summary ?? "Consultá con la institución a quién alcanza este convenio.",
        coverage: row.coverage_summary ?? "Cobertura a confirmar con la institución.",
        modalities: row.modality_notes ? [row.modality_notes] : [],
        services: servicesByAgreement.get(row.id) ?? [],
        benefits: row.benefits,
        eligibility: row.eligibility,
        access: row.access_steps,
        validity: formatValidity(row.valid_from, row.valid_until),
        professionalCount: memberCountByAgreement.get(row.id) ?? 0,
        isDemo: row.is_demo,
      },
    ];
  });
}

async function listDatabaseAgreements(): Promise<Agreement[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("agreements")
    .select(
      "id,institution_id,slug,name,summary,modality_notes,audience_summary,coverage_summary,benefits,eligibility,access_steps,valid_from,valid_until,is_demo",
    )
    .eq("status", "PUBLISHED")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error("No se pudieron cargar los convenios publicados.", { cause: error });
  }
  return buildAgreements((data ?? []) as AgreementRow[]);
}

async function getDatabaseAgreement(slug: string): Promise<Agreement | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("agreements")
    .select(
      "id,institution_id,slug,name,summary,modality_notes,audience_summary,coverage_summary,benefits,eligibility,access_steps,valid_from,valid_until,is_demo",
    )
    .eq("status", "PUBLISHED")
    .eq("is_public", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error("No se pudo cargar el convenio solicitado.", { cause: error });
  }
  if (!data) return null;
  const [agreement] = await buildAgreements([data as AgreementRow]);
  return agreement ?? null;
}

async function listDatabaseAgreementSlugs() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("agreements")
    .select("slug")
    .eq("status", "PUBLISHED")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error("No se pudieron cargar las rutas de convenios.", { cause: error });
  }
  return (data ?? []) as Array<{ slug: string }>;
}

export const publicRepository = {
  async listProfessionals(filters: ProfessionalFilters = {}) {
    return shouldUseDemoData()
      ? demoRepository.listProfessionals(filters)
      : listDatabaseProfessionals(filters);
  },

  async getProfessional(slug: string) {
    return shouldUseDemoData()
      ? demoRepository.getProfessional(slug)
      : getDatabaseProfessional(slug);
  },

  async getFeaturedProfessionals(limit = 3) {
    const professionals = await this.listProfessionals({ sort: "featured" });
    return professionals.slice(0, limit);
  },

  async listProfessionalSlugs() {
    if (shouldUseDemoData()) return demoRepository.listProfessionalSlugs();
    const supabase = createPublicClient();
    const taxonomies = await getTaxonomies();
    const { data, error } = await supabase
      .from("professional_directory")
      .select("slug,professional_type_ids")
      .order("published_at", { ascending: false });
    if (error) {
      throw new Error("No se pudieron cargar las rutas profesionales.", {
        cause: error,
      });
    }
    return (data ?? [])
      .filter((row) =>
        hasOnlySupportedProfessionalTypes(
          row as Pick<DirectoryRow, "professional_type_ids">,
          taxonomies,
        ),
      )
      .map(({ slug }) => ({ slug }));
  },

  async listResources() {
    return shouldUseDemoData() ? demoRepository.listResources() : listDatabaseResources();
  },

  async getResource(slug: string) {
    return shouldUseDemoData() ? demoRepository.getResource(slug) : getDatabaseResource(slug);
  },

  async listResourceSlugs() {
    return shouldUseDemoData() ? demoRepository.listResourceSlugs() : listDatabaseResourceSlugs();
  },

  async listAgreements() {
    return shouldUseDemoData() ? demoRepository.listAgreements() : listDatabaseAgreements();
  },

  async getAgreement(slug: string) {
    return shouldUseDemoData() ? demoRepository.getAgreement(slug) : getDatabaseAgreement(slug);
  },

  async listAgreementSlugs() {
    return shouldUseDemoData() ? demoRepository.listAgreementSlugs() : listDatabaseAgreementSlugs();
  },

  async listPlans() {
    return shouldUseDemoData()
      ? demoRepository.listPlans()
      : listDatabasePlans();
  },
};
