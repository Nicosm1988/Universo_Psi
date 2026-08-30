export type Modality = "online" | "presencial" | "a_domicilio";

const MODALITY_LABELS: Record<Modality, string> = {
  online: "Online",
  presencial: "Presencial",
  a_domicilio: "A domicilio",
};

export function modalityLabel(modality: Modality): string {
  return MODALITY_LABELS[modality];
}

export type Professional = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  role: string;
  credential: string;
  headline: string;
  about: string;
  needs: string[];
  contactNeeds?: Array<{ id: string; label: string }>;
  professionalType: string;
  specialties: string[];
  modalities: Modality[];
  city: string;
  province: string;
  country: string;
  languages: string[];
  audiences: string[];
  careerStages: string[];
  industries: string[];
  serviceTypes: string[];
  agreementSlugs: string[];
  verified: boolean;
  featured: boolean;
  isDemo?: boolean;
  acceptingLeads?: boolean;
  availabilityOrder: number;
  availabilityLabel: string;
  rating: number;
  reviewCount: number;
  workingStyle: string[];
  experience: Array<{ role: string; organization: string }>;
  education: Array<{ title: string; institution: string }>;
  credentials: string[];
  testimonials: Array<{ quote: string; author: string; context: string }>;
};

export type ResourceArticle = {
  slug: string;
  title: string;
  eyebrow: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  author: string;
  authorRole: string;
  professionalSlug?: string;
  lead: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  takeaways: string[];
  isDemo?: boolean;
};

export type Agreement = {
  slug: string;
  institution: string;
  institutionInitials: string;
  kind: string;
  title: string;
  excerpt: string;
  audience: string;
  coverage: string;
  modalities: string[];
  services: string[];
  benefits: string[];
  eligibility: string[];
  access: string[];
  validity: string;
  professionalCount: number;
  isDemo?: boolean;
};

export type Plan = {
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  currency: "ARS";
  featured?: boolean;
  badge?: string;
  features: string[];
  cta: string;
};

export type ProfessionalFilters = {
  q?: string;
  need?: string[];
  type?: string[];
  modality?: string[];
  location?: string[];
  language?: string[];
  verified?: boolean;
  sort?: string;
};

export const needOptions = [
  { value: "ansiedad", label: "Ansiedad" },
  { value: "animo-y-depresion", label: "Estado de ánimo y depresión" },
  { value: "duelo", label: "Duelo" },
  { value: "estres-y-agotamiento", label: "Estrés y agotamiento" },
  { value: "autoestima", label: "Autoestima" },
  { value: "relacion-de-pareja", label: "Relación de pareja" },
  { value: "dificultades-de-aprendizaje", label: "Dificultades de aprendizaje" },
  { value: "trauma", label: "Trauma" },
  { value: "conflictos-familiares", label: "Conflictos familiares" },
  { value: "transiciones-vitales", label: "Transiciones vitales" },
] as const;

export const professionalTypeOptions = [
  { value: "psicologia", label: "Psicólogo/a" },
  { value: "psicopedagogia", label: "Psicopedagogo/a" },
  { value: "psiquiatria", label: "Psiquiatra" },
  { value: "musicoterapia", label: "Musicoterapeuta" },
  { value: "terapia-ocupacional", label: "Terapista ocupacional" },
  { value: "fonoaudiologia", label: "Fonoaudiólogo/a" },
  { value: "terapia-familiar-sistemica", label: "Terapeuta familiar sistémico/a" },
  { value: "arteterapia", label: "Arteterapeuta" },
  { value: "acompanamiento-en-adicciones", label: "Acompañante terapéutico en adicciones" },
  { value: "educacion-especial", label: "Especialista en educación especial" },
  { value: "trabajo-social", label: "Trabajador/a social" },
  { value: "psicomotricidad", label: "Psicomotricista" },
] as const;

export const modalityOptions = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "a_domicilio", label: "A domicilio" },
] as const;

export const locationOptions = [
  { value: "caba", label: "Ciudad de Buenos Aires" },
  { value: "cordoba", label: "Córdoba" },
  { value: "mendoza", label: "Mendoza" },
  { value: "rosario", label: "Rosario" },
] as const;

export const languageOptions = [
  { value: "espanol", label: "Español" },
  { value: "ingles", label: "Inglés" },
  { value: "portugues", label: "Portugués" },
] as const;

export const sortOptions = [
  { value: "relevance", label: "Relevancia" },
  { value: "match", label: "Mejor coincidencia" },
  { value: "recommended", label: "Recomendados" },
  { value: "availability", label: "Disponibilidad" },
  { value: "featured", label: "Destacados" },
] as const;

const professionals: Professional[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    slug: "valentina-acosta",
    name: "Valentina Acosta",
    initials: "VA",
    role: "Psicóloga",
    credential: "M.P. 48.271 · CABA",
    headline: "Un espacio para poner en palabras lo que pesa y encontrar de a poco más claridad.",
    about:
      "Acompaño a jóvenes y personas adultas que atraviesan ansiedad, angustia o malestar frente a decisiones importantes. Mi trabajo no parte de fórmulas cerradas: construimos juntos herramientas concretas, revisamos pensamientos que generan sufrimiento y sostenemos el proceso con pasos pequeños y posibles.",
    needs: ["ansiedad", "animo-y-depresion", "transiciones-vitales"],
    professionalType: "psicologia",
    specialties: ["Terapia cognitivo-conductual", "Terapia breve centrada en soluciones"],
    modalities: ["online", "presencial"],
    city: "Ciudad de Buenos Aires",
    province: "caba",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Adolescentes", "Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual", "Evaluación psicológica"],
    agreementSlugs: ["comunidad-universitaria-del-rio"],
    verified: true,
    featured: true,
    availabilityOrder: 2,
    availabilityLabel: "Próximo espacio: jueves",
    rating: 4.9,
    reviewCount: 28,
    workingStyle: [
      "Primera entrevista para ordenar el motivo de consulta y acordar objetivos.",
      "Trabajo semanal con herramientas cognitivo-conductuales y tareas entre sesiones.",
      "Revisiones periódicas del proceso y ajuste conjunto de los objetivos.",
    ],
    experience: [
      { role: "Psicóloga clínica", organization: "Práctica independiente" },
      { role: "Terapeuta", organization: "Centro de Salud Mental Puentes" },
    ],
    education: [
      { title: "Licenciatura en Psicología", institution: "Universidad de Buenos Aires" },
      { title: "Formación en Terapia Cognitivo-Conductual", institution: "Universidad Nacional de Tres de Febrero" },
    ],
    credentials: ["Matrícula profesional revisada", "Formación de posgrado validada"],
    testimonials: [
      {
        quote: "Me ayudó a entender de dónde venía la angustia y a encontrar formas concretas de manejarla.",
        author: "Marina, 24",
        context: "Proceso de terapia individual",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    slug: "lucas-ibarra",
    name: "Lucas Ibarra",
    initials: "LI",
    role: "Psiquiatra",
    credential: "M.N. 71.402",
    headline: "Evaluación y seguimiento cercano para sostener un tratamiento con criterio.",
    about:
      "Realizo evaluaciones psiquiátricas y acompaño el seguimiento de tratamientos junto con la persona y, cuando corresponde, con su equipo terapéutico. El objetivo es entender bien qué está pasando, revisar la medicación cuando es necesario y sostener los ajustes con información clara.",
    needs: ["duelo", "estres-y-agotamiento"],
    professionalType: "psiquiatria",
    specialties: ["Psicofarmacología", "Evaluación diagnóstica"],
    modalities: ["online"],
    city: "Córdoba",
    province: "cordoba",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Interconsulta psiquiátrica", "Evaluación psicológica"],
    agreementSlugs: ["alianza-talento-norte"],
    verified: true,
    featured: false,
    availabilityOrder: 1,
    availabilityLabel: "Próximo espacio: martes",
    rating: 4.8,
    reviewCount: 19,
    workingStyle: [
      "Primera entrevista extensa para reconstruir la historia clínica.",
      "Revisión conjunta del tratamiento y explicación clara de cada decisión.",
      "Seguimiento periódico y coordinación con el equipo tratante cuando hace falta.",
    ],
    experience: [
      { role: "Médico psiquiatra", organization: "Práctica independiente" },
      { role: "Psiquiatra de planta", organization: "Hospital Regional del Centro" },
    ],
    education: [
      { title: "Medicina con especialización en Psiquiatría", institution: "Universidad Nacional de Córdoba" },
      { title: "Concurrencia en Salud Mental", institution: "Hospital Regional del Centro" },
    ],
    credentials: ["Matrícula médica revisada", "Identidad validada"],
    testimonials: [
      {
        quote: "Me explicó cada paso del tratamiento y eso me dio mucha más tranquilidad.",
        author: "Pablo, 37",
        context: "Seguimiento de tratamiento",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    slug: "ines-moreno",
    name: "Inés Moreno",
    initials: "IM",
    role: "Psicopedagoga",
    credential: "M.P. 15.930 · Santa Fe",
    headline: "Estrategias claras para acompañar a cada chico o chica en su forma de aprender.",
    about:
      "Acompaño a niños/as y adolescentes con dificultades de aprendizaje, en conjunto con sus familias y la escuela. Evaluamos cómo aprende cada uno, identificamos obstáculos concretos y armamos estrategias aplicables en la vida cotidiana y en el aula.",
    needs: ["dificultades-de-aprendizaje", "conflictos-familiares"],
    professionalType: "psicopedagogia",
    specialties: ["Evaluación psicopedagógica", "Estrategias de aprendizaje"],
    modalities: ["online"],
    city: "Rosario",
    province: "rosario",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Niños/as", "Adolescentes"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Evaluación psicológica", "Terapia individual"],
    agreementSlugs: ["programa-reimpulso-litoral"],
    verified: true,
    featured: true,
    availabilityOrder: 4,
    availabilityLabel: "Próximo espacio: viernes",
    rating: 5,
    reviewCount: 34,
    workingStyle: [
      "Entrevista inicial con la familia para entender el contexto y las dificultades actuales.",
      "Evaluación psicopedagógica y devolución en lenguaje simple.",
      "Diseño de estrategias concretas para el hogar y coordinación con la escuela.",
    ],
    experience: [
      { role: "Psicopedagoga", organization: "Práctica independiente" },
      { role: "Orientadora educativa", organization: "Programa Horizonte" },
    ],
    education: [
      { title: "Licenciatura en Psicopedagogía", institution: "Universidad Nacional de Rosario" },
      { title: "Posgrado en Dificultades de Aprendizaje", institution: "Universidad Nacional de Tres de Febrero" },
    ],
    credentials: ["Matrícula profesional revisada", "Formación universitaria validada"],
    testimonials: [
      {
        quote: "Nos ayudó a entender qué le pasaba a nuestra hija y a acompañarla mejor en casa y en la escuela.",
        author: "Florencia, 22",
        context: "Acompañamiento psicopedagógico",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    slug: "tomas-ferrer",
    name: "Tomás Ferrer",
    initials: "TF",
    role: "Psicólogo · Neuropsicólogo",
    credential: "M.P. 22.884 · Mendoza",
    headline: "Evaluación neuropsicológica clara para entender qué está pasando y qué sigue.",
    about:
      "Evalúo funciones cognitivas como memoria, atención y lenguaje, y acompaño procesos de rehabilitación con devoluciones comprensibles. Trabajo con personas que atravesaron un evento que afectó su funcionamiento cognitivo y necesitan entender el diagnóstico sin tecnicismos.",
    needs: ["trauma", "dificultades-de-aprendizaje"],
    professionalType: "psicologia",
    specialties: ["Neuropsicología", "Evaluación neuropsicológica"],
    modalities: ["online"],
    city: "Mendoza",
    province: "mendoza",
    country: "Argentina",
    languages: ["espanol", "ingles", "portugues"],
    audiences: ["Adultos", "Adultos mayores"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Evaluación psicológica", "Terapia individual"],
    agreementSlugs: ["alianza-talento-norte"],
    verified: true,
    featured: false,
    availabilityOrder: 3,
    availabilityLabel: "Próximo espacio: miércoles",
    rating: 4.9,
    reviewCount: 16,
    workingStyle: [
      "Entrevista inicial y batería de pruebas cognitivas adaptada a cada caso.",
      "Devolución en lenguaje simple, sin tecnicismos innecesarios.",
      "Plan de seguimiento y ejercicios de estimulación cuando corresponde.",
    ],
    experience: [
      { role: "Neuropsicólogo clínico", organization: "Colectivo Norte de Salud" },
      { role: "Evaluador neuropsicológico", organization: "Centro de Rehabilitación Cognitiva" },
    ],
    education: [
      { title: "Licenciatura en Psicología", institution: "Universidad Nacional de Cuyo" },
      { title: "Formación en Neuropsicología Clínica", institution: "Universidad Favaloro" },
    ],
    credentials: ["Matrícula profesional revisada", "Identidad validada"],
    testimonials: [
      {
        quote: "Me explicó los resultados de la evaluación de una forma que finalmente pude entender.",
        author: "Leandro, 35",
        context: "Evaluación neuropsicológica",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    slug: "mariana-ortiz",
    name: "Mariana Ortiz",
    initials: "MO",
    role: "Psicóloga",
    credential: "M.P. 9.184 · Córdoba",
    headline: "Un espacio para escuchar qué pide el malestar antes de convertirlo en un diagnóstico.",
    about:
      "Trabajo con ansiedad, agotamiento y preguntas de identidad que aparecen en la vida adulta. La propuesta es comprender qué se volvió insostenible, reconocer recursos propios y construir un movimiento cuidadoso, sin fórmulas ni decisiones impulsivas.",
    needs: ["ansiedad", "estres-y-agotamiento", "autoestima"],
    professionalType: "psicologia",
    specialties: ["Enfoque humanístico", "Manejo del estrés"],
    modalities: ["online", "presencial"],
    city: "Córdoba",
    province: "cordoba",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: ["programa-reimpulso-litoral"],
    verified: false,
    featured: false,
    availabilityOrder: 6,
    availabilityLabel: "Consulta por nuevos espacios",
    rating: 4.8,
    reviewCount: 22,
    workingStyle: [
      "Delimitamos la situación y aquello que hoy necesita cuidado.",
      "Trabajamos patrones, expectativas y sentidos ligados al malestar actual.",
      "Cuando corresponde, construimos condiciones para un cambio sostenible.",
    ],
    experience: [
      { role: "Psicóloga clínica", organization: "Práctica clínica independiente" },
      { role: "Terapeuta", organization: "Red de Salud Mental Comunitaria" },
    ],
    education: [
      { title: "Licenciatura en Psicología", institution: "Universidad Nacional de Córdoba" },
      { title: "Especialización en Estrés y Ansiedad", institution: "Universidad Nacional de Córdoba" },
    ],
    credentials: ["Matrícula profesional revisada", "Formación de especialización validada"],
    testimonials: [
      {
        quote: "Pude entender que no estaba fallando: necesitaba cambiar la forma en que venía sosteniendo mi día a día.",
        author: "Carla, 42",
        context: "Proceso de terapia individual",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    slug: "agustin-paz",
    name: "Agustín Paz",
    initials: "AP",
    role: "Psicólogo",
    credential: "M.P. 33.560 · CABA",
    headline: "Acompañamiento a la pareja o la familia para conversar lo que cuesta nombrar.",
    about:
      "Trabajo desde un enfoque sistémico con parejas y familias que atraviesan un conflicto sostenido en el tiempo. Ayudo a reconocer patrones repetidos, roles y formas de comunicación que se volvieron rígidas, para poder conversar con más criterio.",
    needs: ["relacion-de-pareja", "conflictos-familiares"],
    professionalType: "psicologia",
    specialties: ["Enfoque sistémico", "Terapia familiar"],
    modalities: ["online", "presencial"],
    city: "Ciudad de Buenos Aires",
    province: "caba",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Parejas y familias"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia de pareja", "Terapia individual"],
    agreementSlugs: ["alianza-talento-norte"],
    verified: false,
    featured: false,
    availabilityOrder: 5,
    availabilityLabel: "Próximo espacio: en 10 días",
    rating: 4.7,
    reviewCount: 8,
    workingStyle: [
      "Entrevista vincular para entender la dinámica y el pedido de cada parte.",
      "Leemos patrones, roles y tensiones antes de proponer cambios.",
      "Trabajamos un plan breve con compromisos entre encuentros.",
    ],
    experience: [
      { role: "Psicólogo clínico", organization: "Práctica independiente" },
      { role: "Terapeuta familiar", organization: "Centro de Terapia Vincular" },
    ],
    education: [
      { title: "Licenciatura en Psicología", institution: "Universidad Nacional de La Plata" },
      { title: "Formación en Terapia Sistémica", institution: "Instituto de la Familia" },
    ],
    credentials: ["Identidad validada", "Verificación de matrícula en curso"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    slug: "gala-rumbo-demo",
    name: "Gala Rumbo Demo",
    initials: "GR",
    role: "Psiquiatra",
    credential: "M.N. 84.213",
    headline: "Interconsulta psiquiátrica con devolución clara sobre el tratamiento.",
    about:
      "Perfil ficticio de demostración. Realizo interconsultas psiquiátricas y ajustes de tratamiento en coordinación con otros profesionales, priorizando una devolución clara sobre cada decisión clínica.",
    needs: ["trauma", "autoestima"],
    professionalType: "psiquiatria",
    specialties: ["Interconsulta psiquiátrica", "Psicofarmacología"],
    modalities: ["online", "presencial"],
    city: "Ciudad de Buenos Aires",
    province: "caba",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Interconsulta psiquiátrica"],
    agreementSlugs: ["comunidad-universitaria-del-rio"],
    verified: false,
    featured: false,
    availabilityOrder: 7,
    availabilityLabel: "Próximo espacio: lunes",
    rating: 4.6,
    reviewCount: 5,
    workingStyle: [
      "Evaluación breve enfocada en el motivo de interconsulta.",
      "Ajuste de tratamiento coordinado con el equipo tratante.",
      "Devolución clara sobre cada paso del proceso.",
    ],
    experience: [{ role: "Médica psiquiatra", organization: "Práctica independiente" }],
    education: [{ title: "Medicina con especialización en Psiquiatría", institution: "Universidad de Buenos Aires" }],
    credentials: ["Matrícula médica en revisión"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111108",
    slug: "hugo-faro-demo",
    name: "Hugo Faro Demo",
    initials: "HF",
    role: "Terapista ocupacional",
    credential: "M.P. 18.077 · Córdoba",
    headline: "Rehabilitación para recuperar autonomía en las actividades de cada día.",
    about:
      "Perfil ficticio de demostración. Ayudo a recuperar o desarrollar habilidades para la vida diaria tras una dificultad de salud mental, con un plan de rehabilitación gradual y realista.",
    needs: ["estres-y-agotamiento", "transiciones-vitales"],
    professionalType: "terapia-ocupacional",
    specialties: ["Rehabilitación ocupacional", "Habilidades para la vida diaria"],
    modalities: ["online"],
    city: "Córdoba",
    province: "cordoba",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Adultos", "Adultos mayores"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: ["programa-reimpulso-litoral"],
    verified: false,
    featured: false,
    availabilityOrder: 8,
    availabilityLabel: "Próximo espacio: en 5 días",
    rating: 4.5,
    reviewCount: 4,
    workingStyle: [
      "Evalúa hábitos, rutinas y dificultades concretas del día a día.",
      "Diseña un plan de rehabilitación gradual y medible.",
      "Revisa avances y ajusta objetivos en cada etapa.",
    ],
    experience: [{ role: "Terapista ocupacional", organization: "Práctica independiente" }],
    education: [{ title: "Licenciatura en Terapia Ocupacional", institution: "Universidad Nacional de Córdoba" }],
    credentials: ["Matrícula profesional en revisión"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111109",
    slug: "ines-umbral-demo",
    name: "Inés Umbral Demo",
    initials: "IU",
    role: "Psicóloga",
    credential: "M.P. 27.641 · Santa Fe",
    headline: "Psicoterapia para sostener un proceso de duelo o un cambio importante.",
    about:
      "Perfil ficticio de demostración. Acompaño procesos de duelo y transiciones vitales significativas, con casos concretos y compromisos claros entre encuentros.",
    needs: ["duelo", "transiciones-vitales"],
    professionalType: "psicologia",
    specialties: ["Acompañamiento en duelo", "Enfoque humanístico"],
    modalities: ["online", "presencial"],
    city: "Rosario",
    province: "rosario",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Adultos", "Adultos mayores"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: ["comunidad-universitaria-del-rio"],
    verified: true,
    featured: true,
    availabilityOrder: 9,
    availabilityLabel: "Próximo espacio: en 2 semanas",
    rating: 4.9,
    reviewCount: 14,
    workingStyle: [
      "Primer encuentro para reconocer la pérdida y lo que hoy pesa más.",
      "Trabajo con casos concretos y compromisos entre encuentros.",
      "Acompañamiento sostenido a lo largo de todo el proceso.",
    ],
    experience: [{ role: "Psicóloga clínica", organization: "Práctica independiente" }],
    education: [{ title: "Licenciatura en Psicología", institution: "Universidad Nacional de Rosario" }],
    credentials: ["Matrícula profesional revisada", "Formación en duelo validada"],
    testimonials: [
      {
        quote: "Me acompañó con mucho respeto en un momento muy difícil.",
        author: "Perfil de demostración",
        context: "Proceso de duelo",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111110",
    slug: "julian-mapa-demo",
    name: "Julián Mapa Demo",
    initials: "JM",
    role: "Psicólogo",
    credential: "M.P. 31.205 · Mendoza",
    headline: "Terapia de pareja para conversar lo que se posterga hace tiempo.",
    about:
      "Perfil ficticio de demostración. Ayudo a parejas a reconocer patrones y conversar con mayor criterio sobre un conflicto sostenido, combinando entrevista vincular con un plan de trabajo breve.",
    needs: ["relacion-de-pareja", "conflictos-familiares"],
    professionalType: "psicologia",
    specialties: ["Terapia de pareja", "Enfoque sistémico"],
    modalities: ["online"],
    city: "Mendoza",
    province: "mendoza",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Parejas y familias"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia de pareja"],
    agreementSlugs: ["alianza-talento-norte"],
    verified: false,
    featured: false,
    availabilityOrder: 10,
    availabilityLabel: "Consulta por nuevos espacios",
    rating: 4.4,
    reviewCount: 3,
    workingStyle: [
      "Entrevista vincular con ambos integrantes de la pareja.",
      "Identificación de patrones de comunicación repetidos.",
      "Plan de trabajo breve con compromisos concretos.",
    ],
    experience: [{ role: "Psicólogo clínico", organization: "Práctica independiente" }],
    education: [{ title: "Licenciatura en Psicología", institution: "Universidad Nacional de Cuyo" }],
    credentials: ["Matrícula profesional en revisión"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "kiara-anden-demo",
    name: "Kiara Andén Demo",
    initials: "KA",
    role: "Musicoterapeuta",
    credential: "M.P. 12.398 · CABA",
    headline: "Musicoterapia grupal para expresar lo que cuesta poner en palabras.",
    about:
      "Perfil ficticio de demostración. Acompaño procesos grupales de expresión y regulación emocional a través de la música, ordenando objetivos terapéuticos y devoluciones para cada participante.",
    needs: ["trauma", "autoestima"],
    professionalType: "musicoterapia",
    specialties: ["Musicoterapia grupal", "Regulación emocional"],
    modalities: ["online", "presencial"],
    city: "Ciudad de Buenos Aires",
    province: "caba",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Niños/as", "Adolescentes"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: ["programa-reimpulso-litoral"],
    verified: true,
    featured: false,
    availabilityOrder: 11,
    availabilityLabel: "Próximo espacio: sábado",
    rating: 4.8,
    reviewCount: 11,
    workingStyle: [
      "Encuadre inicial de objetivos terapéuticos con cada participante.",
      "Sesiones grupales de expresión a través de la música.",
      "Devolución periódica sobre el proceso y los avances.",
    ],
    experience: [{ role: "Musicoterapeuta", organization: "Práctica independiente" }],
    education: [{ title: "Licenciatura en Musicoterapia", institution: "Universidad de Buenos Aires" }],
    credentials: ["Matrícula profesional revisada"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111112",
    slug: "lautaro-via-demo",
    name: "Lautaro Vía Demo",
    initials: "LV",
    role: "Psicólogo",
    credential: "M.P. 40.756 · Córdoba",
    headline: "Terapia individual para sostener pequeños pasos hacia un cambio real.",
    about:
      "Perfil ficticio de demostración. Ayudo a explorar el vínculo entre el malestar actual, los recursos propios y los próximos pasos posibles, trabajando con objetivos pequeños y evidencia temprana de avance.",
    needs: ["ansiedad", "autoestima"],
    professionalType: "psicologia",
    specialties: ["Terapia breve centrada en soluciones"],
    modalities: ["online", "presencial"],
    city: "Córdoba",
    province: "cordoba",
    country: "Argentina",
    languages: ["espanol", "portugues"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: [],
    verified: false,
    featured: false,
    availabilityOrder: 12,
    availabilityLabel: "Disponibilidad por lista de espera",
    rating: 4.3,
    reviewCount: 2,
    workingStyle: [
      "Definimos objetivos pequeños y alcanzables desde el primer encuentro.",
      "Revisamos avances con evidencia concreta de cada semana.",
      "Ajustamos el proceso según lo que va funcionando.",
    ],
    experience: [{ role: "Psicólogo clínico", organization: "Práctica independiente" }],
    education: [{ title: "Licenciatura en Psicología", institution: "Universidad Nacional de Córdoba" }],
    credentials: ["Matrícula profesional en revisión"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111113",
    slug: "maia-prisma-demo",
    name: "Maia Prisma Demo",
    initials: "MP",
    role: "Psicopedagoga",
    credential: "M.P. 19.442 · Santa Fe",
    headline: "Orientación psicopedagógica para explorar dificultades de aprendizaje.",
    about:
      "Perfil ficticio en estado borrador, usado para probar el circuito de alta de profesionales de Universo Psi.",
    needs: ["dificultades-de-aprendizaje"],
    professionalType: "psicopedagogia",
    specialties: ["Orientación psicopedagógica"],
    modalities: ["online"],
    city: "Rosario",
    province: "rosario",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Niños/as"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: [],
    verified: false,
    featured: false,
    availabilityOrder: 90,
    availabilityLabel: "Perfil en borrador",
    rating: 0,
    reviewCount: 0,
    workingStyle: [
      "Perfil incompleto: contenido pendiente de carga.",
      "Enfoque demostrativo basado en evaluación psicopedagógica.",
      "Sin disponibilidad publicada por el momento.",
    ],
    experience: [{ role: "Psicopedagoga", organization: "Experiencia de ejemplo" }],
    education: [{ title: "Licenciatura en Psicopedagogía", institution: "Formación ficticia" }],
    credentials: ["Perfil en borrador"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111114",
    slug: "nicolas-atlas-demo",
    name: "Nicolás Atlas Demo",
    initials: "NA",
    role: "Psicólogo",
    credential: "M.P. 36.870 · Mendoza",
    headline: "Psicoterapia individual para trabajar ansiedad y autoestima.",
    about:
      "Perfil ficticio pendiente de revisión, usado para probar el circuito administrativo de Universo Psi.",
    needs: ["ansiedad", "autoestima"],
    professionalType: "psicologia",
    specialties: ["Terapia cognitivo-conductual"],
    modalities: ["online"],
    city: "Mendoza",
    province: "mendoza",
    country: "Argentina",
    languages: ["espanol", "ingles"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: [],
    verified: false,
    featured: false,
    availabilityOrder: 91,
    availabilityLabel: "Pendiente de revisión",
    rating: 0,
    reviewCount: 0,
    workingStyle: [
      "Perfil pendiente de revisión administrativa.",
      "Enfoque práctico de demostración.",
      "Sin disponibilidad publicada por el momento.",
    ],
    experience: [{ role: "Psicólogo clínico", organization: "Experiencia ficticia" }],
    education: [{ title: "Licenciatura en Psicología", institution: "Formación ficticia" }],
    credentials: ["Perfil pendiente de revisión"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111115",
    slug: "olivia-nexo-demo",
    name: "Olivia Nexo Demo",
    initials: "ON",
    role: "Psiquiatra",
    credential: "M.N. 90.114",
    headline: "Interconsulta psiquiátrica para revisar un tratamiento en curso.",
    about:
      "Perfil ficticio rechazado, usado para probar estados y mensajes administrativos. Ningún dato identifica a una persona real.",
    needs: ["animo-y-depresion"],
    professionalType: "psiquiatria",
    specialties: ["Interconsulta psiquiátrica"],
    modalities: ["presencial"],
    city: "Ciudad de Buenos Aires",
    province: "caba",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Adultos"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Interconsulta psiquiátrica"],
    agreementSlugs: [],
    verified: false,
    featured: false,
    availabilityOrder: 92,
    availabilityLabel: "Perfil no disponible",
    rating: 0,
    reviewCount: 0,
    workingStyle: [
      "Perfil rechazado durante la revisión administrativa.",
      "Metodología ficticia usada sólo para pruebas.",
      "Sin disponibilidad publicada.",
    ],
    experience: [{ role: "Médica psiquiatra", organization: "Experiencia sintética" }],
    education: [{ title: "Medicina con especialización en Psiquiatría", institution: "Formación de ejemplo" }],
    credentials: ["Perfil rechazado en revisión administrativa"],
    testimonials: [],
  },
  {
    id: "11111111-1111-4111-8111-111111111116",
    slug: "pablo-delta-demo",
    name: "Pablo Delta Demo",
    initials: "PD",
    role: "Terapista ocupacional",
    credential: "M.P. 24.509 · Córdoba",
    headline: "Rehabilitación ocupacional para recuperar rutinas diarias.",
    about:
      "Perfil ficticio suspendido, usado para probar la exclusión del catálogo público y las herramientas de administración.",
    needs: ["transiciones-vitales"],
    professionalType: "terapia-ocupacional",
    specialties: ["Rehabilitación ocupacional"],
    modalities: ["online"],
    city: "Córdoba",
    province: "cordoba",
    country: "Argentina",
    languages: ["espanol"],
    audiences: ["Adultos mayores"],
    careerStages: [],
    industries: [],
    serviceTypes: ["Terapia individual"],
    agreementSlugs: [],
    verified: false,
    featured: false,
    availabilityOrder: 93,
    availabilityLabel: "Perfil suspendido",
    rating: 0,
    reviewCount: 0,
    workingStyle: [
      "Perfil suspendido tras una revisión administrativa.",
      "Enfoque de prueba orientado a experimentos internos.",
      "Sin disponibilidad publicada.",
    ],
    experience: [{ role: "Terapista ocupacional", organization: "Experiencia completamente ficticia" }],
    education: [{ title: "Licenciatura en Terapia Ocupacional", institution: "Formación de ejemplo" }],
    credentials: ["Perfil suspendido"],
    testimonials: [],
  },
];

const publishedProfessionals = professionals
  .filter((professional) =>
    ["psicologia", "psicopedagogia"].includes(professional.professionalType),
  )
  .map((professional) => ({ ...professional, isDemo: true }));

const resources: ResourceArticle[] = [
  {
    slug: "cambiar-de-trabajo-o-de-rumbo",
    title: "¿Cambiar de trabajo o cambiar de rumbo? Una distinción para empezar",
    eyebrow: "Decisiones de carrera",
    excerpt: "Tres preguntas para diferenciar el desgaste con un contexto del deseo genuino de transformar tu trayectoria.",
    category: "Transiciones",
    publishedAt: "2026-07-28",
    readingTime: "6 min",
    author: "Valentina Acosta",
    authorRole: "Psicóloga · Orientadora vocacional",
    professionalSlug: "valentina-acosta",
    lead:
      "Cuando todo pesa, cambiar de profesión parece una respuesta completa. A veces lo es. Otras veces, el problema está en el contexto, el rol o la manera en que el trabajo ocupa la vida. Separar esas capas evita exigirle a una sola decisión que resuelva todo.",
    sections: [
      {
        heading: "Primero: nombrá qué querés dejar",
        paragraphs: [
          "No es lo mismo querer salir de una jefatura que de una disciplina. Probá escribir una lista muy concreta de situaciones que ya no querés sostener: tareas, ritmos, vínculos, condiciones, valores o formas de reconocimiento.",
          "Después preguntate cuáles de esos elementos pertenecen a tu profesión y cuáles a este trabajo en particular. La diferencia puede abrir alternativas que hoy están tapadas por el cansancio.",
        ],
      },
      {
        heading: "Buscá evidencia fuera de la fantasía",
        paragraphs: [
          "Un rumbo nuevo se entiende mejor con experiencias pequeñas que con meses de pensamiento circular. Una conversación con alguien del área, un proyecto breve o una clase abierta permiten sentir el trabajo real detrás de una etiqueta atractiva.",
          "La exploración no compromete una decisión. Su función es producir información propia para que la decisión futura sea menos abstracta.",
        ],
      },
      {
        heading: "Diseñá una transición, no un salto heroico",
        paragraphs: [
          "Cambiar puede incluir conservar ingresos, reducir riesgos y aprovechar capacidades ya desarrolladas. Las transiciones más sostenibles suelen tener puentes: proyectos adyacentes, roles híbridos, formación acotada y conversaciones tempranas.",
        ],
      },
    ],
    takeaways: [
      "Separá profesión, rol, organización y condiciones de trabajo.",
      "Probá hipótesis con experiencias pequeñas antes de decidir.",
      "Construí puentes que cuiden recursos, vínculos e identidad.",
    ],
  },
  {
    slug: "preparar-una-entrevista-sin-actuar-un-personaje",
    title: "Preparar una entrevista sin actuar un personaje",
    eyebrow: "Búsqueda laboral",
    excerpt: "Cómo llegar con una narrativa clara, ejemplos honestos y preguntas que también te permitan elegir.",
    category: "Empleabilidad",
    publishedAt: "2026-07-16",
    readingTime: "5 min",
    author: "Inés Moreno",
    authorRole: "Especialista en empleabilidad",
    professionalSlug: "ines-moreno",
    lead:
      "Prepararse no significa memorizar respuestas perfectas. Significa entender qué necesita conocer la otra parte, elegir evidencia concreta y llegar con suficiente claridad para sostener una conversación de doble vía.",
    sections: [
      {
        heading: "Elegí cuatro historias, no veinte respuestas",
        paragraphs: [
          "Identificá experiencias que muestren aprendizaje, colaboración, resolución de problemas y criterio. Una misma historia puede responder distintas preguntas si conocés bien el contexto, tu aporte y el resultado.",
        ],
      },
      {
        heading: "Traducí, no infles",
        paragraphs: [
          "Tu experiencia puede ser valiosa y, al mismo tiempo, estar expresada en un lenguaje que el nuevo contexto no reconoce. Preparar una entrevista implica traducir responsabilidades en problemas resueltos, decisiones tomadas y aprendizajes transferibles.",
          "La claridad genera más confianza que una lista de adjetivos difíciles de comprobar.",
        ],
      },
      {
        heading: "Llevá preguntas que te ayuden a decidir",
        paragraphs: [
          "Preguntá cómo se define un buen primer semestre, qué tensiones atraviesa hoy el equipo y qué autonomía tendrá el rol. No son preguntas para impresionar: son información para evaluar si el trabajo también encaja con vos.",
        ],
      },
    ],
    takeaways: [
      "Prepará historias concretas y adaptables.",
      "Explicá tu aporte con evidencia, sin sobreactuar seguridad.",
      "Usá la entrevista para evaluar el contexto, no sólo para ser evaluado.",
    ],
  },
  {
    slug: "explorar-roles-digitales-con-criterio",
    title: "Explorar roles digitales sin empezar de cero",
    eyebrow: "Transición digital",
    excerpt: "Un mapa para reconocer capacidades transferibles y probar un rol antes de comprometer tiempo y dinero.",
    category: "Reinvención",
    publishedAt: "2026-06-30",
    readingTime: "7 min",
    author: "Tomás Ferrer",
    authorRole: "Mentor de transición digital",
    professionalSlug: "tomas-ferrer",
    lead:
      "Tecnología no es un único destino ni exige borrar tu historia profesional. El primer trabajo es comprender familias de problemas y reconocer qué capacidades ya construiste para resolverlos.",
    sections: [
      {
        heading: "Empezá por problemas, no por títulos",
        paragraphs: [
          "Producto, datos, experiencia de usuario y operaciones digitales agrupan trabajos muy distintos. Investigá qué problemas resuelve cada equipo durante una semana normal antes de elegir una etiqueta profesional.",
        ],
      },
      {
        heading: "Hacé inventario de lo transferible",
        paragraphs: [
          "Facilitar acuerdos, comprender usuarios, ordenar información compleja o mejorar procesos son capacidades valiosas en múltiples roles. Escribí ejemplos donde ya las aplicaste y observá qué parte disfrutaste.",
        ],
      },
      {
        heading: "Probá el trabajo en escala pequeña",
        paragraphs: [
          "Antes de una formación extensa, armá una práctica breve con un problema real: analizá un flujo, entrevistá usuarios, ordená métricas o documentá un proceso. La experiencia te dará preguntas mucho mejores para elegir cómo seguir.",
        ],
      },
    ],
    takeaways: [
      "Investigá el trabajo cotidiano detrás de cada rol.",
      "Conectá capacidades previas con problemas nuevos.",
      "Probá primero; elegí formación con evidencia después.",
    ],
  },
  {
    slug: "primeros-noventa-dias-liderando",
    title: "Los primeros noventa días liderando: qué conviene observar antes de cambiar",
    eyebrow: "Liderazgo",
    excerpt: "Una guía serena para leer el sistema, cuidar acuerdos y no confundir velocidad con impacto.",
    category: "Desarrollo",
    publishedAt: "2026-06-12",
    readingTime: "8 min",
    author: "Agustín Paz",
    authorRole: "Mentor de liderazgo",
    professionalSlug: "agustin-paz",
    lead:
      "El primer impulso al asumir un equipo suele ser demostrar valor con cambios rápidos. Sin contexto, esa velocidad puede romper acuerdos invisibles. Observar bien también es una forma de liderazgo.",
    sections: [
      {
        heading: "Leé el sistema informal",
        paragraphs: [
          "Además del organigrama, existen personas de referencia, rituales útiles y tensiones antiguas. Conversá con distintas voces y contrastá versiones antes de convertir una impresión en diagnóstico.",
        ],
      },
      {
        heading: "Acordá qué significa progresar",
        paragraphs: [
          "Clarificá con tu responsable y con el equipo cuáles son los resultados importantes, qué restricciones existen y qué decisiones te corresponden. La ambigüedad no se resuelve trabajando más horas.",
        ],
      },
      {
        heading: "Elegí una mejora que enseñe",
        paragraphs: [
          "Un cambio acotado permite observar cómo decide el equipo, dónde circula la información y qué apoyos faltan. Buscá una mejora real, reversible y suficientemente visible para aprender juntos.",
        ],
      },
    ],
    takeaways: [
      "Escuchá voces diversas antes de sacar conclusiones.",
      "Volvé explícitos resultados, restricciones y decisiones.",
      "Usá una mejora acotada para aprender cómo funciona el sistema.",
    ],
  },
];

const agreements: Agreement[] = [
  {
    slug: "comunidad-universitaria-del-rio",
    institution: "Universidad del Río",
    institutionInitials: "UR",
    kind: "Universidad",
    title: "Orientación para estudiantes y graduados recientes",
    excerpt: "Un acceso acompañado a orientación vocacional, reorientación y primeros pasos de empleabilidad.",
    audience: "Estudiantes regulares y personas graduadas durante los últimos 24 meses.",
    coverage: "Argentina",
    modalities: ["Online", "Presencial en CABA"],
    services: ["Consulta inicial de orientación", "Proceso breve de reorientación", "Revisión de estrategia de primer empleo"],
    benefits: ["Arancel preferencial", "Primera orientación sin cargo", "Profesionales con credenciales revisadas"],
    eligibility: ["Ser estudiante regular", "O haber egresado hace menos de 24 meses", "Contar con correo institucional activo"],
    access: ["Completá la solicitud con tu correo institucional.", "Recibí un código personal y las condiciones del convenio.", "Elegí entre los profesionales adheridos y coordiná directamente."],
    validity: "Vigente hasta el 31 de diciembre de 2026",
    professionalCount: 8,
  },
  {
    slug: "alianza-talento-norte",
    institution: "Cámara Talento Norte",
    institutionInitials: "TN",
    kind: "Asociación profesional",
    title: "Desarrollo y movilidad para profesionales asociados",
    excerpt: "Mentoría, coaching de carrera y transición sectorial para acompañar movimientos de mediano plazo.",
    audience: "Personas asociadas activas de la Cámara Talento Norte.",
    coverage: "Todo el país",
    modalities: ["Online"],
    services: ["Coaching de carrera", "Mentoría de liderazgo", "Transición a roles digitales"],
    benefits: ["20% de beneficio en la primera sesión", "Agenda prioritaria", "Encuentros abiertos trimestrales"],
    eligibility: ["Membresía activa", "Código de asociado vigente"],
    access: ["Ingresá tu número de asociado.", "Validamos la membresía sin compartir información innecesaria.", "Accedé al catálogo específico y coordiná tu primera conversación."],
    validity: "Vigente durante 2026",
    professionalCount: 12,
  },
  {
    slug: "programa-reimpulso-litoral",
    institution: "Fundación Reimpulso",
    institutionInitials: "FR",
    kind: "Fundación",
    title: "Acompañamiento para volver al trabajo",
    excerpt: "Un programa focalizado para personas desempleadas que necesitan sostén y herramientas en su reinserción.",
    audience: "Participantes derivados por organizaciones aliadas de Fundación Reimpulso.",
    coverage: "Santa Fe y Córdoba",
    modalities: ["Online", "Presencial según sede"],
    services: ["Orientación de reinserción", "CV y posicionamiento", "Preparación de entrevistas"],
    benefits: ["Hasta tres encuentros cubiertos", "Seguimiento durante 60 días", "Derivación según necesidad"],
    eligibility: ["Participar del programa Reimpulso", "Contar con derivación de una sede habilitada"],
    access: ["Solicitá la derivación en tu sede.", "El equipo del programa valida el cupo.", "Universo Psi te propone opciones y explica el criterio de selección."],
    validity: "Cupos mensuales sujetos a disponibilidad",
    professionalCount: 6,
  },
];

const plans: Plan[] = [
  {
    slug: "base",
    name: "Profesional",
    description: "Un solo plan con todo lo necesario para tener presencia profesional y recibir consultas.",
    monthlyPrice: 120000,
    currency: "ARS",
    featured: true,
    features: ["Perfil público completo", "Presencia en el buscador", "Recepción y gestión de contactos", "Verificación según tu profesión", "Panel con métricas esenciales"],
    cta: "Suscribirme",
  },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

const includesAny = (source: string[], filters?: string[]) =>
  !filters?.length || filters.some((filter) => source.includes(filter));

const matchingScore = (professional: Professional, filters: ProfessionalFilters) => {
  let score = professional.rating * 2 + Math.min(professional.reviewCount / 10, 4);
  score += filters.need?.filter((need) => professional.needs.includes(need)).length ?? 0;
  score += (filters.type?.includes(professional.professionalType) ? 1 : 0) * 2;
  score += filters.modality?.filter((mode) => professional.modalities.includes(mode as Modality)).length ?? 0;
  return score;
};

export const publicRepository = {
  async listProfessionals(filters: ProfessionalFilters = {}) {
    const query = filters.q ? normalize(filters.q) : "";
    const filtered = publishedProfessionals.filter((professional) => {
      const searchable = normalize(
        [
          professional.name,
          professional.role,
          professional.headline,
          professional.city,
          ...professional.specialties,
          ...professional.industries,
        ].join(" "),
      );

      return (
        (!query || searchable.includes(query)) &&
        includesAny(professional.needs, filters.need) &&
        (!filters.type?.length || filters.type.includes(professional.professionalType)) &&
        includesAny(professional.modalities, filters.modality) &&
        (!filters.location?.length || filters.location.includes(professional.province)) &&
        includesAny(professional.languages, filters.language) &&
        (!filters.verified || professional.verified)
      );
    });

    const sorted = [...filtered];
    switch (filters.sort) {
      case "availability":
        sorted.sort((a, b) => a.availabilityOrder - b.availabilityOrder);
        break;
      case "recommended":
        sorted.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
        break;
      case "featured":
        sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
        break;
      case "match":
        sorted.sort((a, b) => matchingScore(b, filters) - matchingScore(a, filters));
        break;
      default:
        sorted.sort((a, b) => matchingScore(b, filters) - matchingScore(a, filters));
    }

    return sorted;
  },

  async getProfessional(slug: string) {
    return publishedProfessionals.find((professional) => professional.slug === slug) ?? null;
  },

  async getFeaturedProfessionals(limit = 3) {
    return [...publishedProfessionals]
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating)
      .slice(0, limit);
  },

  async listProfessionalSlugs() {
    return publishedProfessionals.map(({ slug }) => ({ slug }));
  },

  async listResources() {
    return [...resources].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },

  async getResource(slug: string) {
    return resources.find((resource) => resource.slug === slug) ?? null;
  },

  async listResourceSlugs() {
    return resources.map(({ slug }) => ({ slug }));
  },

  async listAgreements() {
    return agreements;
  },

  async getAgreement(slug: string) {
    return agreements.find((agreement) => agreement.slug === slug) ?? null;
  },

  async listAgreementSlugs() {
    return agreements.map(({ slug }) => ({ slug }));
  },

  async listPlans() {
    return plans;
  },
};

export const getNeedLabel = (value: string) =>
  needOptions.find((option) => option.value === value)?.label ?? value;

export const getProfessionalTypeLabel = (value: string) =>
  professionalTypeOptions.find((option) => option.value === value)?.label ?? value;

export const formatRating = (rating: number) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);

export const formatPlanPrice = (plan: Pick<Plan, "monthlyPrice" | "currency">) =>
  plan.monthlyPrice === null
    ? "Precio a confirmar"
    : new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: plan.currency,
        maximumFractionDigits: 0,
      }).format(plan.monthlyPrice);
