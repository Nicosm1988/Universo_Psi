begin;

-- ---------------------------------------------------------------------------
-- Core configuration (safe for every environment)
-- ---------------------------------------------------------------------------

insert into public.professional_types
  (id, code, slug, name, description, is_regulated, sort_order, is_active)
values
  ('20000000-0000-4000-8000-000000000001', 'psychologist', 'psicologia', 'Psicólogo/a', 'Evaluación, acompañamiento y tratamiento psicológico.', true, 10, true),
  ('20000000-0000-4000-8000-000000000002', 'psychopedagogue', 'psicopedagogia', 'Psicopedagogo/a', 'Evaluación y acompañamiento de procesos de aprendizaje.', true, 20, true),
  ('20000000-0000-4000-8000-000000000003', 'psychiatrist', 'psiquiatria', 'Psiquiatra', 'Diagnóstico y tratamiento médico de la salud mental.', true, 30, true),
  ('20000000-0000-4000-8000-000000000004', 'music_therapist', 'musicoterapia', 'Musicoterapeuta', 'Intervención terapéutica a través de la música.', true, 40, true),
  ('20000000-0000-4000-8000-000000000005', 'occupational_therapist', 'terapia-ocupacional', 'Terapista ocupacional', 'Rehabilitación y desarrollo de habilidades para la vida diaria.', true, 50, true),
  ('20000000-0000-4000-8000-000000000006', 'speech_therapist', 'fonoaudiologia', 'Fonoaudiólogo/a', 'Comunicación, lenguaje y deglución.', true, 60, true),
  ('20000000-0000-4000-8000-000000000007', 'family_therapist', 'terapia-familiar-sistemica', 'Terapeuta familiar sistémico/a', 'Intervención sistémica sobre la familia como unidad.', false, 70, true),
  ('20000000-0000-4000-8000-000000000008', 'art_therapist', 'arteterapia', 'Arteterapeuta', 'Intervención terapéutica a través de la expresión artística.', false, 80, true),
  ('20000000-0000-4000-8000-000000000009', 'addiction_counselor', 'acompanamiento-en-adicciones', 'Acompañante terapéutico en adicciones', 'Acompañamiento especializado en consumos problemáticos.', false, 90, true),
  ('20000000-0000-4000-8000-000000000010', 'special_education', 'educacion-especial', 'Especialista en educación especial', 'Apoyo pedagógico a trayectorias con necesidades específicas.', false, 100, true),
  ('20000000-0000-4000-8000-000000000011', 'social_worker', 'trabajo-social', 'Trabajador/a social', 'Intervención social vinculada a la salud mental.', false, 110, true),
  ('20000000-0000-4000-8000-000000000012', 'psychomotor_therapist', 'psicomotricidad', 'Psicomotricista', 'Intervención sobre el desarrollo psicomotor.', true, 120, true)
on conflict (id) do update set
  code = excluded.code, slug = excluded.slug, name = excluded.name,
  description = excluded.description, is_regulated = excluded.is_regulated,
  sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.credential_types (id, code, name, description, sort_order)
values
  ('21000000-0000-4000-8000-000000000001', 'professional_license', 'Matrícula profesional', 'Matrícula y jurisdicción de ejercicio.', 10),
  ('21000000-0000-4000-8000-000000000002', 'university_degree', 'Título universitario', 'Título emitido por una institución educativa.', 20),
  ('21000000-0000-4000-8000-000000000003', 'specialty_certificate', 'Certificación de especialidad', 'Certificación y entidad emisora.', 30),
  ('21000000-0000-4000-8000-000000000004', 'professional_experience', 'Experiencia profesional', 'Antecedentes verificables de experiencia.', 40),
  ('21000000-0000-4000-8000-000000000005', 'specialization_certificate', 'Certificación de especialización', 'Formación específica relevante para el servicio.', 50)
on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = true;

insert into public.verification_rules
  (professional_type_id, credential_type_id, requirement_level, jurisdiction_required, instructions)
values
  ('20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario.'),
  ('20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título habilitante.'),
  ('20000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula médica vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título de médico/a con especialidad en psiquiatría.'),
  ('20000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en musicoterapia.'),
  ('20000000-0000-4000-8000-000000000005', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000005', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en terapia ocupacional.'),
  ('20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000005', 'OPTIONAL', false, 'Acreditar formación de especialización cuando corresponda.'),
  ('20000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000004', 'OPTIONAL', false, 'Acreditar experiencia institucional relevante.'),
  ('20000000-0000-4000-8000-000000000006', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000006', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en fonoaudiología.'),
  ('20000000-0000-4000-8000-000000000007', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en salud mental o disciplina afín.'),
  ('20000000-0000-4000-8000-000000000007', '21000000-0000-4000-8000-000000000003', 'REQUIRED', false, 'Presentar certificación en terapia familiar sistémica.'),
  ('20000000-0000-4000-8000-000000000008', '21000000-0000-4000-8000-000000000003', 'REQUIRED', false, 'Presentar certificación en arteterapia y entidad emisora.'),
  ('20000000-0000-4000-8000-000000000009', '21000000-0000-4000-8000-000000000003', 'REQUIRED', false, 'Presentar certificación en acompañamiento terapéutico y entidad emisora.'),
  ('20000000-0000-4000-8000-000000000009', '21000000-0000-4000-8000-000000000004', 'OPTIONAL', false, 'Acreditar experiencia institucional relevante.'),
  ('20000000-0000-4000-8000-000000000010', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título docente o de especialización en educación especial.'),
  ('20000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en trabajo social.'),
  ('20000000-0000-4000-8000-000000000012', '21000000-0000-4000-8000-000000000001', 'REQUIRED', true, 'Presentar matrícula vigente y jurisdicción.'),
  ('20000000-0000-4000-8000-000000000012', '21000000-0000-4000-8000-000000000002', 'REQUIRED', false, 'Presentar título universitario en psicomotricidad.')
on conflict (professional_type_id, credential_type_id) do update set
  requirement_level = excluded.requirement_level,
  jurisdiction_required = excluded.jurisdiction_required,
  instructions = excluded.instructions,
  is_active = true;

insert into public.needs (id, code, slug, name, short_description, sort_order)
values
  ('22000000-0000-4000-8000-000000000001', 'anxiety', 'ansiedad', 'Ansiedad', 'Preocupación excesiva, angustia o ataques de pánico.', 10),
  ('22000000-0000-4000-8000-000000000002', 'mood_depression', 'animo-y-depresion', 'Estado de ánimo y depresión', 'Tristeza persistente, desmotivación o pérdida de interés.', 20),
  ('22000000-0000-4000-8000-000000000003', 'grief', 'duelo', 'Duelo', 'Acompañamiento ante una pérdida.', 30),
  ('22000000-0000-4000-8000-000000000004', 'stress_burnout', 'estres-y-agotamiento', 'Estrés y agotamiento', 'Sobrecarga, burnout o dificultad para sostener el ritmo diario.', 40),
  ('22000000-0000-4000-8000-000000000005', 'self_esteem', 'autoestima', 'Autoestima', 'Trabajo sobre autoimagen y autovaloración.', 50),
  ('22000000-0000-4000-8000-000000000006', 'couple_relationship', 'relacion-de-pareja', 'Relación de pareja', 'Conflictos, comunicación o crisis de pareja.', 60),
  ('22000000-0000-4000-8000-000000000007', 'learning_difficulties', 'dificultades-de-aprendizaje', 'Dificultades de aprendizaje', 'Dificultades escolares, de atención o de aprendizaje.', 70),
  ('22000000-0000-4000-8000-000000000008', 'trauma', 'trauma', 'Trauma', 'Procesamiento de experiencias traumáticas.', 80),
  ('22000000-0000-4000-8000-000000000009', 'family_conflict', 'conflictos-familiares', 'Conflictos familiares', 'Dinámicas y conflictos dentro de la familia.', 90),
  ('22000000-0000-4000-8000-000000000010', 'life_transitions', 'transiciones-vitales', 'Transiciones vitales', 'Cambios vitales significativos: mudanza, maternidad/paternidad, jubilación.', 100),
  ('22000000-0000-4000-8000-000000000011', 'autism_asd', 'autismo-y-tea', 'Autismo y TEA', 'Acompañamiento en trastorno del espectro autista.', 110),
  ('22000000-0000-4000-8000-000000000012', 'disability', 'discapacidad', 'Discapacidad', 'Acompañamiento en situación de discapacidad.', 120),
  ('22000000-0000-4000-8000-000000000013', 'chronic_neurological_illness', 'enfermedades-cronicas-y-neurologicas', 'Enfermedades crónicas y neurológicas', 'Acompañamiento ante enfermedades crónicas o neurológicas.', 130),
  ('22000000-0000-4000-8000-000000000014', 'phobias_panic', 'fobias-y-ataques-de-panico', 'Fobias y ataques de pánico', 'Miedos específicos, fobias o crisis de pánico.', 140),
  ('22000000-0000-4000-8000-000000000015', 'gender_diversity', 'genero-y-diversidad', 'Género y diversidad', 'Acompañamiento en identidad de género y diversidad sexual.', 150),
  ('22000000-0000-4000-8000-000000000016', 'fertility_adoption', 'fertilidad-y-adopcion', 'Fertilidad y adopción', 'Acompañamiento en procesos de fertilidad o adopción.', 160),
  ('22000000-0000-4000-8000-000000000017', 'parenting_guidance', 'orientacion-a-padres', 'Orientación a padres', 'Acompañamiento a madres, padres y cuidadores.', 170),
  ('22000000-0000-4000-8000-000000000018', 'psychosis_dementia', 'psicosis-y-demencias', 'Psicosis y demencias', 'Acompañamiento en psicosis o demencias.', 180),
  ('22000000-0000-4000-8000-000000000019', 'sexuality_disorders', 'trastornos-de-la-sexualidad', 'Trastornos de la sexualidad', 'Dificultades relacionadas con la sexualidad.', 190),
  ('22000000-0000-4000-8000-000000000020', 'eating_disorders', 'trastornos-alimentarios', 'Trastornos alimentarios', 'Acompañamiento en trastornos de la conducta alimentaria.', 200),
  ('22000000-0000-4000-8000-000000000021', 'violence_abuse', 'violencia-y-abuso', 'Violencia y abuso', 'Acompañamiento ante situaciones de violencia o abuso.', 210),
  ('22000000-0000-4000-8000-000000000022', 'palliative_care', 'cuidados-paliativos', 'Cuidados paliativos', 'Acompañamiento en cuidados paliativos.', 220),
  ('22000000-0000-4000-8000-000000000023', 'early_stimulation', 'estimulacion-temprana', 'Estimulación temprana', 'Estimulación del desarrollo en la primera infancia.', 230)
on conflict (id) do update set name = excluded.name, short_description = excluded.short_description, is_active = true;

insert into public.services (id, code, slug, name, description, sort_order)
values
  ('23000000-0000-4000-8000-000000000001', 'individual_therapy', 'terapia-individual', 'Terapia individual', 'Proceso terapéutico uno a uno.', 10),
  ('23000000-0000-4000-8000-000000000002', 'couple_therapy', 'terapia-de-pareja', 'Terapia de pareja', 'Acompañamiento de la relación de pareja.', 20),
  ('23000000-0000-4000-8000-000000000003', 'family_therapy', 'terapia-familiar', 'Terapia familiar', 'Intervención con la familia como unidad.', 30),
  ('23000000-0000-4000-8000-000000000004', 'psychological_assessment', 'evaluacion-psicologica', 'Evaluación psicológica', 'Evaluación diagnóstica mediante entrevistas y pruebas.', 40),
  ('23000000-0000-4000-8000-000000000005', 'neuropsychological_assessment', 'evaluacion-neuropsicologica', 'Evaluación neuropsicológica', 'Evaluación de funciones cognitivas.', 50),
  ('23000000-0000-4000-8000-000000000006', 'psychopedagogical_guidance', 'orientacion-psicopedagogica', 'Orientación psicopedagógica', 'Acompañamiento de procesos de aprendizaje.', 60),
  ('23000000-0000-4000-8000-000000000007', 'psychiatric_consultation', 'interconsulta-psiquiatrica', 'Interconsulta psiquiátrica', 'Evaluación y seguimiento médico-psiquiátrico.', 70),
  ('23000000-0000-4000-8000-000000000008', 'group_music_therapy', 'musicoterapia-grupal', 'Musicoterapia grupal', 'Intervención musicoterapéutica en grupo.', 80),
  ('23000000-0000-4000-8000-000000000009', 'occupational_rehabilitation', 'rehabilitacion-ocupacional', 'Rehabilitación ocupacional', 'Desarrollo de habilidades para la vida diaria.', 90),
  ('23000000-0000-4000-8000-000000000010', 'child_adolescent_therapy', 'terapia-infanto-juvenil', 'Terapia infanto-juvenil', 'Acompañamiento terapéutico de niños/as y adolescentes.', 100),
  ('23000000-0000-4000-8000-000000000011', 'group_therapy', 'terapia-grupal', 'Terapia grupal', 'Proceso terapéutico en grupo.', 110)
on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = true;

insert into public.specialties (id, code, slug, name, sort_order)
values
  ('24000000-0000-4000-8000-000000000001', 'cbt', 'terapia-cognitivo-conductual', 'Terapia cognitivo-conductual (TCC)', 10),
  ('24000000-0000-4000-8000-000000000002', 'psychoanalysis', 'psicoanalisis', 'Psicoanálisis', 20),
  ('24000000-0000-4000-8000-000000000003', 'systemic_approach', 'enfoque-sistemico', 'Enfoque sistémico', 30),
  ('24000000-0000-4000-8000-000000000004', 'emdr', 'emdr', 'EMDR', 40),
  ('24000000-0000-4000-8000-000000000005', 'neuropsychology', 'neuropsicologia', 'Neuropsicología', 50),
  ('24000000-0000-4000-8000-000000000006', 'psychooncology', 'psicooncologia', 'Psicooncología', 60),
  ('24000000-0000-4000-8000-000000000007', 'perinatal_psychology', 'psicologia-perinatal', 'Psicología perinatal', 70),
  ('24000000-0000-4000-8000-000000000008', 'clinical_sexology', 'sexologia-clinica', 'Sexología clínica', 80),
  ('24000000-0000-4000-8000-000000000009', 'psychogerontology', 'psicogerontologia', 'Psicogerontología', 90),
  ('24000000-0000-4000-8000-000000000010', 'humanistic_approach', 'enfoque-humanistico', 'Enfoque humanístico', 100),
  ('24000000-0000-4000-8000-000000000011', 'logotherapy', 'logoterapia', 'Logoterapia', 110),
  ('24000000-0000-4000-8000-000000000012', 'psychodrama', 'psicodrama', 'Psicodrama', 120),
  ('24000000-0000-4000-8000-000000000013', 'positive_psychology', 'psicologia-positiva', 'Psicología positiva', 130),
  ('24000000-0000-4000-8000-000000000014', 'integrative_psychotherapy', 'psicoterapia-integral', 'Psicoterapia integral', 140),
  ('24000000-0000-4000-8000-000000000015', 'reichian_body_psychotherapy', 'psicocorporal-reichiana', 'Psicocorporal reichiana', 150),
  ('24000000-0000-4000-8000-000000000016', 'constructivist_therapy', 'terapia-constructivista', 'Terapia constructivista', 160),
  ('24000000-0000-4000-8000-000000000017', 'jungian_therapy', 'terapia-junguiana', 'Terapia junguiana', 170),
  ('24000000-0000-4000-8000-000000000018', 'gestalt_therapy', 'terapia-gestaltica', 'Terapia gestáltica', 180),
  ('24000000-0000-4000-8000-000000000019', 'sports_psychology', 'deportologia', 'Deportología', 190),
  ('24000000-0000-4000-8000-000000000020', 'mindfulness', 'mindfulness', 'Mindfulness', 200)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.audiences (id, code, name, sort_order)
values
  ('25000000-0000-4000-8000-000000000001', 'children', 'Niños/as', 10),
  ('25000000-0000-4000-8000-000000000002', 'adolescents', 'Adolescentes', 20),
  ('25000000-0000-4000-8000-000000000003', 'adults', 'Adultos', 30),
  ('25000000-0000-4000-8000-000000000004', 'older_adults', 'Adultos mayores', 40),
  ('25000000-0000-4000-8000-000000000005', 'couples_families', 'Parejas y familias', 50)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.modalities (id, code, name, sort_order)
values
  ('26000000-0000-4000-8000-000000000001', 'ONLINE', 'Online', 10),
  ('26000000-0000-4000-8000-000000000002', 'IN_PERSON', 'Presencial', 20),
  ('26000000-0000-4000-8000-000000000003', 'HYBRID', 'Híbrida', 30),
  ('26000000-0000-4000-8000-000000000004', 'HOME_VISIT', 'A domicilio', 40)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.locations
  (id, parent_id, kind, country_code, slug, name, full_name, timezone, sort_order)
values
  ('27000000-0000-4000-8000-000000000001', null, 'COUNTRY', 'AR', 'argentina', 'Argentina', 'Argentina', 'America/Argentina/Buenos_Aires', 10),
  ('27000000-0000-4000-8000-000000000010', '27000000-0000-4000-8000-000000000001', 'PROVINCE', 'AR', 'buenos-aires', 'Buenos Aires', 'Buenos Aires, Argentina', 'America/Argentina/Buenos_Aires', 20),
  ('27000000-0000-4000-8000-000000000011', '27000000-0000-4000-8000-000000000001', 'PROVINCE', 'AR', 'cordoba', 'Córdoba', 'Córdoba, Argentina', 'America/Argentina/Cordoba', 30),
  ('27000000-0000-4000-8000-000000000012', '27000000-0000-4000-8000-000000000001', 'PROVINCE', 'AR', 'santa-fe', 'Santa Fe', 'Santa Fe, Argentina', 'America/Argentina/Cordoba', 40),
  ('27000000-0000-4000-8000-000000000013', '27000000-0000-4000-8000-000000000001', 'PROVINCE', 'AR', 'mendoza', 'Mendoza', 'Mendoza, Argentina', 'America/Argentina/Mendoza', 50),
  ('27000000-0000-4000-8000-000000000014', '27000000-0000-4000-8000-000000000001', 'PROVINCE', 'AR', 'caba', 'Ciudad Autónoma de Buenos Aires', 'CABA, Argentina', 'America/Argentina/Buenos_Aires', 15),
  ('27000000-0000-4000-8000-000000000101', '27000000-0000-4000-8000-000000000014', 'CITY', 'AR', 'buenos-aires', 'Buenos Aires', 'Buenos Aires, CABA, Argentina', 'America/Argentina/Buenos_Aires', 10),
  ('27000000-0000-4000-8000-000000000102', '27000000-0000-4000-8000-000000000011', 'CITY', 'AR', 'cordoba-capital', 'Córdoba Capital', 'Córdoba Capital, Córdoba, Argentina', 'America/Argentina/Cordoba', 20),
  ('27000000-0000-4000-8000-000000000103', '27000000-0000-4000-8000-000000000012', 'CITY', 'AR', 'rosario', 'Rosario', 'Rosario, Santa Fe, Argentina', 'America/Argentina/Cordoba', 30),
  ('27000000-0000-4000-8000-000000000104', '27000000-0000-4000-8000-000000000013', 'CITY', 'AR', 'mendoza-capital', 'Mendoza Capital', 'Mendoza Capital, Mendoza, Argentina', 'America/Argentina/Mendoza', 40),
  ('27000000-0000-4000-8000-000000000105', '27000000-0000-4000-8000-000000000010', 'CITY', 'AR', 'mar-del-plata', 'Mar del Plata', 'Mar del Plata, Buenos Aires, Argentina', 'America/Argentina/Buenos_Aires', 50)
on conflict (id) do update set name = excluded.name, full_name = excluded.full_name, is_active = true;

insert into public.languages (id, code, name, sort_order)
values
  ('28000000-0000-4000-8000-000000000001', 'es', 'Español', 10),
  ('28000000-0000-4000-8000-000000000002', 'en', 'Inglés', 20),
  ('28000000-0000-4000-8000-000000000003', 'pt', 'Portugués', 30),
  ('28000000-0000-4000-8000-000000000004', 'de', 'Alemán', 40),
  ('28000000-0000-4000-8000-000000000005', 'sign_language', 'Lengua de señas', 50)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.industries (id, code, slug, name, sort_order)
values
  ('29000000-0000-4000-8000-000000000001', 'technology', 'tecnologia', 'Tecnología', 10),
  ('29000000-0000-4000-8000-000000000002', 'education', 'educacion', 'Educación', 20),
  ('29000000-0000-4000-8000-000000000003', 'health', 'salud', 'Salud', 30),
  ('29000000-0000-4000-8000-000000000004', 'professional_services', 'servicios-profesionales', 'Servicios profesionales', 40),
  ('29000000-0000-4000-8000-000000000005', 'retail', 'retail', 'Retail y consumo', 50),
  ('29000000-0000-4000-8000-000000000006', 'finance', 'finanzas', 'Finanzas', 60)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.career_stages (id, code, slug, name, sort_order)
values
  ('2a000000-0000-4000-8000-000000000001', 'exploration', 'exploracion', 'Exploración y primera elección', 10),
  ('2a000000-0000-4000-8000-000000000002', 'early_career', 'inicio-profesional', 'Inicio profesional', 20),
  ('2a000000-0000-4000-8000-000000000003', 'mid_career', 'carrera-media', 'Carrera media', 30),
  ('2a000000-0000-4000-8000-000000000004', 'senior', 'senior', 'Profesional senior', 40),
  ('2a000000-0000-4000-8000-000000000005', 'leadership', 'liderazgo', 'Liderazgo', 50),
  ('2a000000-0000-4000-8000-000000000006', 'reinvention', 'reinvencion', 'Reinvención', 60)
on conflict (id) do update set name = excluded.name, is_active = true;

-- Pricing intentionally remains DRAFT: the owner must approve commercial
-- amounts. This avoids presenting invented subscription prices as final.
insert into public.plans
  (id, code, name, description, price_amount, currency, billing_interval,
   pricing_status, monthly_lead_quota, ranking_boost_points, visibility_score, sort_order, is_active,
   payment_model, commitment_cycles, grace_period_days)
values
  ('2b000000-0000-4000-8000-000000000001', 'PROFESSIONAL_MONTHLY', 'Profesional · Mensual', 'Perfil público, buscador, recepción de contactos y panel de leads. Cobro mensual recurrente.', 120000, 'ARS', 'MONTH', 'PUBLISHED', null, 0, 40, 10, true, 'RECURRING', null, 3),
  ('2b000000-0000-4000-8000-000000000002', 'PROFESSIONAL_6M', 'Profesional · Semestral', 'Igual que el plan mensual, con un compromiso de 6 cobros mensuales automáticos.', null, 'ARS', 'MONTH', 'DRAFT', null, 0, 40, 20, false, 'RECURRING', 6, 3),
  ('2b000000-0000-4000-8000-000000000003', 'PROFESSIONAL_12M', 'Profesional · Anual (cuotas)', 'Igual que el plan mensual, con un compromiso de 12 cobros mensuales automáticos.', null, 'ARS', 'MONTH', 'DRAFT', null, 0, 40, 30, false, 'RECURRING', 12, 3),
  ('2b000000-0000-4000-8000-000000000004', 'PROFESSIONAL_ANNUAL_UPFRONT', 'Profesional · Anual (pago único)', 'Un solo pago que cubre 12 meses, sin cobros recurrentes.', null, 'ARS', 'YEAR', 'DRAFT', null, 0, 40, 40, false, 'ONE_TIME', null, 3)
on conflict (id) do update set
  code = excluded.code, name = excluded.name, description = excluded.description,
  price_amount = excluded.price_amount, pricing_status = excluded.pricing_status,
  ranking_boost_points = excluded.ranking_boost_points, is_active = excluded.is_active,
  payment_model = excluded.payment_model, commitment_cycles = excluded.commitment_cycles,
  grace_period_days = excluded.grace_period_days;

insert into public.plan_entitlements (plan_id, entitlement_code, enabled, limit_value, configuration)
values
  ('2b000000-0000-4000-8000-000000000001', 'public_profile', true, null, '{}'),
  ('2b000000-0000-4000-8000-000000000001', 'receive_leads', true, null, '{}'),
  ('2b000000-0000-4000-8000-000000000002', 'analytics', true, null, '{"level":"standard"}'),
  ('2b000000-0000-4000-8000-000000000002', 'publish_articles', true, null, '{}'),
  ('2b000000-0000-4000-8000-000000000003', 'analytics', true, null, '{"level":"advanced"}'),
  ('2b000000-0000-4000-8000-000000000003', 'agreement_priority', true, null, '{}')
on conflict (plan_id, entitlement_code) do update set
  enabled = excluded.enabled, limit_value = excluded.limit_value, configuration = excluded.configuration;

insert into public.article_categories (id, slug, name, description, sort_order)
values
  ('2c000000-0000-4000-8000-000000000001', 'decisiones', 'Decisiones', 'Herramientas para decidir con más claridad.', 10),
  ('2c000000-0000-4000-8000-000000000002', 'empleabilidad', 'Empleabilidad', 'Búsqueda laboral y posicionamiento.', 20),
  ('2c000000-0000-4000-8000-000000000003', 'transiciones', 'Transiciones', 'Cambios de carrera, rol o industria.', 30),
  ('2c000000-0000-4000-8000-000000000004', 'liderazgo', 'Liderazgo', 'Desafíos de crecimiento y gestión.', 40)
on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = true;

-- Initial deterministic questionnaire.
insert into public.matching_questions
  (id, rule_version, code, prompt, help_text, answer_type, position)
values
  ('2d000000-0000-4000-8000-000000000001', 'match-v1', 'current_situation', '¿Qué situación se parece más a la que estás atravesando?', 'No es un diagnóstico; sólo orienta tipos de acompañamiento.', 'SINGLE', 10),
  ('2d000000-0000-4000-8000-000000000002', 'match-v1', 'preferred_focus', '¿Qué te gustaría trabajar primero?', null, 'SINGLE', 20),
  ('2d000000-0000-4000-8000-000000000003', 'match-v1', 'preferred_modality', '¿Qué modalidad preferís?', null, 'SINGLE', 30)
on conflict (id) do update set prompt = excluded.prompt, help_text = excluded.help_text, is_active = true;

insert into public.matching_options (id, question_id, code, label, description, position)
values
  ('2e000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'choose_studies', 'No sé qué estudiar', null, 10),
  ('2e000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000001', 'change_career', 'Quiero cambiar de carrera', null, 20),
  ('2e000000-0000-4000-8000-000000000003', '2d000000-0000-4000-8000-000000000001', 'find_job', 'Necesito conseguir trabajo', null, 30),
  ('2e000000-0000-4000-8000-000000000004', '2d000000-0000-4000-8000-000000000001', 'move_to_tech', 'Quiero pasar a tecnología', null, 40),
  ('2e000000-0000-4000-8000-000000000005', '2d000000-0000-4000-8000-000000000002', 'explore_identity', 'Explorar intereses y dirección', null, 10),
  ('2e000000-0000-4000-8000-000000000006', '2d000000-0000-4000-8000-000000000002', 'practical_tools', 'Trabajar herramientas concretas', null, 20),
  ('2e000000-0000-4000-8000-000000000007', '2d000000-0000-4000-8000-000000000003', 'online', 'Online', null, 10),
  ('2e000000-0000-4000-8000-000000000008', '2d000000-0000-4000-8000-000000000003', 'in_person', 'Presencial', null, 20),
  ('2e000000-0000-4000-8000-000000000009', '2d000000-0000-4000-8000-000000000003', 'either', 'Cualquiera', null, 30)
on conflict (id) do update set label = excluded.label, description = excluded.description, is_active = true;

delete from public.matching_rules where rule_version = 'match-v1';

insert into public.matching_rules
  (rule_version, option_id, need_id, service_id, professional_type_id, modality_id, weight, reason)
values
  ('match-v1', '2e000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', null, null, null, 40, 'Acompaña una primera elección educativa.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000001', null, '23000000-0000-4000-8000-000000000001', null, null, 25, 'Ofrece un proceso de orientación vocacional.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000003', null, null, null, 40, 'Trabaja procesos de reinvención profesional.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000002', null, null, '20000000-0000-4000-8000-000000000011', null, 25, 'Acompaña el rediseño de trayectoria.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-000000000005', null, null, null, 40, 'Acompaña una búsqueda laboral activa.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000003', null, '23000000-0000-4000-8000-000000000003', null, null, 25, 'Trabaja estrategia de búsqueda laboral.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000006', null, null, null, 40, 'Se enfoca en una transición hacia tecnología.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000004', null, null, '20000000-0000-4000-8000-000000000008', null, 25, 'Aporta experiencia de mentoría tecnológica.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000005', null, null, '20000000-0000-4000-8000-000000000001', null, 15, 'Propone un espacio de exploración de intereses.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000006', null, null, '20000000-0000-4000-8000-000000000005', null, 15, 'Aporta herramientas concretas de empleabilidad.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000007', null, null, null, '26000000-0000-4000-8000-000000000001', 15, 'Atiende en modalidad online.'),
  ('match-v1', '2e000000-0000-4000-8000-000000000008', null, null, null, '26000000-0000-4000-8000-000000000002', 15, 'Atiende en modalidad presencial.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Clearly fictional demo data. No auth users, passwords, emails or real PII.
-- ---------------------------------------------------------------------------

insert into public.professional_profiles
  (id, slug, first_name, last_name, headline, bio, approach, experience_summary,
   education_summary, years_experience, starting_price, currency,
   availability_status, next_available_on, publication_status,
   verification_state, published_at, is_accepting_leads, is_demo)
values
  ('11111111-1111-4111-8111-111111111101', 'valentina-acosta', 'Valentina', 'Acosta', 'Un espacio para poner en palabras lo que pesa y encontrar de a poco más claridad', 'Perfil completamente ficticio creado para probar Universo Psi. Acompaña a jóvenes y personas adultas con ansiedad y ansiedad ante decisiones importantes, sin prometer respuestas automáticas.', 'Escucha activa, herramientas cognitivo-conductuales y seguimiento entre sesiones.', 'Trayectoria ficticia en psicología clínica con adultos.', 'Formación y credenciales sintéticas, sin vínculo con una persona real.', 12, 35000, 'ARS', 'AVAILABLE', '2026-08-20', 'PUBLISHED', 'VERIFIED', '2026-01-15 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111102', 'lucas-ibarra', 'Lucas', 'Ibarra', 'Evaluación y seguimiento médico para sostener un tratamiento con criterio', 'Perfil ficticio de demostración. Evalúa y acompaña médicamente a personas que necesitan ajustar un tratamiento o comprender mejor un diagnóstico.', 'Entrevista clínica, revisión de tratamiento y coordinación con el equipo tratante.', 'Experiencia demostrativa en psiquiatría clínica.', 'Certificaciones ficticias consignadas únicamente para pruebas.', 9, 42000, 'ARS', 'AVAILABLE', '2026-08-19', 'PUBLISHED', 'VERIFIED', '2026-01-16 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111103', 'ines-moreno', 'Inés', 'Moreno', 'Estrategias para comprender cómo aprende cada chico o chica y acompañar sin apuro', 'Perfil ficticio creado para el entorno demo. Acompaña a niños/as y adolescentes con dificultades de aprendizaje, en conjunto con familias y escuela.', 'Evaluación psicopedagógica, entrevistas y estrategias de aprendizaje personalizadas.', 'Experiencia ficticia en psicopedagogía infantil.', 'Información educativa y credenciales totalmente sintéticas.', 11, 30000, 'ARS', 'LIMITED', '2026-08-22', 'PUBLISHED', 'VERIFIED', '2026-01-17 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111104', 'tomas-ferrer', 'Tomás', 'Ferrer', 'Evaluación neuropsicológica clara para entender qué está pasando y qué sigue', 'Perfil ficticio para probar filtros y búsqueda. Evalúa funciones cognitivas y acompaña procesos de rehabilitación con devoluciones comprensibles.', 'Batería de pruebas, devolución en lenguaje simple y seguimiento del proceso.', 'Trayectoria demostrativa en neuropsicología clínica.', 'Datos formativos íntegramente ficticios.', 13, 45, 'USD', 'WAITLIST', null, 'PUBLISHED', 'VERIFIED', '2026-01-18 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111105', 'mariana-ortiz', 'Mariana', 'Ortiz', 'Un espacio para escuchar qué pide el malestar antes de convertirlo en un diagnóstico', 'Perfil ficticio de prueba. Trabaja con ansiedad, agotamiento y preguntas de identidad para construir movimientos cuidadosos, sin fórmulas ni decisiones impulsivas.', 'Explora patrones, recursos propios y sentidos ligados al malestar actual.', 'Experiencia demostrativa en psicología clínica y estrés.', 'Antecedentes y matrícula completamente sintéticos.', 15, 38000, 'ARS', 'ASK', null, 'PUBLISHED', 'VERIFIED', '2026-01-19 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111106', 'agustin-paz', 'Agustín', 'Paz', 'Acompañamiento a la pareja o la familia para conversar lo que cuesta nombrar', 'Perfil ficticio creado para validar la experiencia del marketplace. Acompaña a parejas y familias en conflicto desde un enfoque sistémico.', 'Trabaja sobre vínculos, roles y patrones de comunicación repetidos.', 'Experiencia ficticia en terapia de pareja y familia.', 'Formación de ejemplo que no corresponde a una persona real.', 18, 55, 'USD', 'LIMITED', '2026-08-29', 'PUBLISHED', 'NOT_VERIFIED', '2026-01-20 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111107', 'gala-rumbo-demo', 'Gala', 'Rumbo Demo', 'Interconsulta psiquiátrica con devolución clara sobre el tratamiento', 'Perfil ficticio para escenarios de prueba. Realiza interconsultas y ajustes de tratamiento en coordinación con otros profesionales.', 'Evaluación breve, ajuste de tratamiento y comunicación con el equipo tratante.', 'Experiencia sintética en psiquiatría de enlace.', 'Datos de formación creados sólo para demo.', 6, 19000, 'ARS', 'AVAILABLE', '2026-08-19', 'PUBLISHED', 'PENDING', '2026-01-21 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111108', 'hugo-faro-demo', 'Hugo', 'Faro Demo', 'Rehabilitación para recuperar autonomía en las actividades de cada día', 'Perfil ficticio de Universo Psi. Ayuda a recuperar o desarrollar habilidades para la vida diaria tras una dificultad de salud mental.', 'Evalúa hábitos, rutinas y diseña un plan de rehabilitación gradual.', 'Experiencia demostrativa en terapia ocupacional.', 'Antecedentes completamente sintéticos.', 10, 24000, 'ARS', 'AVAILABLE', '2026-08-21', 'PUBLISHED', 'NOT_VERIFIED', '2026-01-22 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111109', 'ines-umbral-demo', 'Inés', 'Umbral Demo', 'Psicoterapia para sostener un proceso de cambio con acompañamiento constante', 'Perfil ficticio para probar el catálogo. Acompaña procesos de duelo y transiciones vitales significativas.', 'Trabaja con casos concretos y compromisos entre encuentros.', 'Experiencia demostrativa en psicología clínica y duelo.', 'Información ficticia sin datos de profesionales reales.', 18, 68000, 'ARS', 'LIMITED', '2026-09-02', 'PUBLISHED', 'VERIFIED', '2026-01-23 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111110', 'julian-mapa-demo', 'Julián', 'Mapa Demo', 'Terapia de pareja para conversar lo que se posterga hace tiempo', 'Perfil ficticio. Ayuda a parejas a reconocer patrones y conversar con mayor criterio sobre un conflicto sostenido.', 'Combina entrevista vincular con un plan de trabajo breve.', 'Experiencia sintética en terapia de pareja.', 'Credenciales creadas para la demostración.', 13, 45000, 'ARS', 'ASK', null, 'PUBLISHED', 'NOT_VERIFIED', '2026-01-24 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111111', 'kiara-anden-demo', 'Kiara', 'Andén Demo', 'Musicoterapia grupal para expresar lo que cuesta poner en palabras', 'Perfil ficticio para validar búsquedas. Acompaña procesos grupales de expresión y regulación emocional a través de la música.', 'Ordena objetivos terapéuticos, sesiones grupales y devolución.', 'Experiencia demostrativa en musicoterapia grupal.', 'Toda la información es sintética.', 9, 39000, 'ARS', 'AVAILABLE', '2026-08-27', 'PUBLISHED', 'VERIFIED', '2026-01-25 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111112', 'lautaro-via-demo', 'Lautaro', 'Vía Demo', 'Terapia individual para sostener pequeños pasos hacia un cambio real', 'Perfil ficticio creado exclusivamente para pruebas. Ayuda a explorar el vínculo entre malestar actual, recursos propios y próximos pasos.', 'Trabaja con objetivos pequeños y evidencia temprana de avance.', 'Trayectoria demostrativa en psicología clínica.', 'Datos ficticios, no representan credenciales reales.', 8, 32000, 'ARS', 'WAITLIST', null, 'PUBLISHED', 'PENDING', '2026-01-26 12:00:00+00', true, true),
  ('11111111-1111-4111-8111-111111111113', 'maia-prisma-demo', 'Maia', 'Prisma Demo', 'Orientación psicopedagógica para explorar dificultades de aprendizaje', 'Perfil ficticio en estado borrador para probar onboarding y administración. No corresponde a ninguna profesional real.', 'Enfoque demostrativo basado en evaluación psicopedagógica.', 'Experiencia de ejemplo.', 'Formación ficticia.', 5, 21000, 'ARS', 'ASK', null, 'DRAFT', 'NOT_VERIFIED', null, false, true),
  ('11111111-1111-4111-8111-111111111114', 'nicolas-atlas-demo', 'Nicolás', 'Atlas Demo', 'Psicoterapia individual para trabajar ansiedad y autoestima', 'Perfil ficticio pendiente de revisión para probar el circuito administrativo de Universo Psi.', 'Enfoque práctico de demostración.', 'Experiencia ficticia en psicología clínica.', 'Antecedentes sintéticos.', 7, 27000, 'ARS', 'ASK', null, 'PENDING_REVIEW', 'PENDING', null, false, true),
  ('11111111-1111-4111-8111-111111111115', 'olivia-nexo-demo', 'Olivia', 'Nexo Demo', 'Interconsulta psiquiátrica para revisar un tratamiento en curso', 'Perfil ficticio rechazado para probar estados y mensajes administrativos. Ningún dato identifica a una persona real.', 'Metodología ficticia para demo.', 'Experiencia sintética.', 'Información educativa de ejemplo.', 10, 41000, 'ARS', 'ASK', null, 'REJECTED', 'REJECTED', null, false, true),
  ('11111111-1111-4111-8111-111111111116', 'pablo-delta-demo', 'Pablo', 'Delta Demo', 'Rehabilitación ocupacional para recuperar rutinas diarias', 'Perfil ficticio suspendido para probar exclusión del catálogo y herramientas de administración.', 'Enfoque de prueba orientado a experimentos.', 'Experiencia completamente ficticia.', 'Antecedentes sintéticos.', 12, 56000, 'ARS', 'ASK', null, 'SUSPENDED', 'EXPIRED', null, false, true)
on conflict (id) do update set
  slug = excluded.slug, first_name = excluded.first_name, last_name = excluded.last_name,
  headline = excluded.headline, bio = excluded.bio, approach = excluded.approach,
  experience_summary = excluded.experience_summary, education_summary = excluded.education_summary,
  starting_price = excluded.starting_price, availability_status = excluded.availability_status,
  publication_status = excluded.publication_status, verification_state = excluded.verification_state,
  published_at = excluded.published_at, is_accepting_leads = excluded.is_accepting_leads,
  is_demo = true;

-- Rebuild demo-only many-to-many assignments so re-running the seed converges
-- after taxonomy changes instead of accumulating stale relationships.
delete from public.professional_profile_types x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_needs x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_services x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_specialties x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_audiences x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_modalities x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_locations x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_languages x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_industries x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;
delete from public.professional_career_stages x using public.professional_profiles p
where x.professional_profile_id = p.id and p.is_demo;

insert into public.professional_profile_types
  (professional_profile_id, professional_type_id, is_primary)
values
  ('11111111-1111-4111-8111-111111111101','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111102','20000000-0000-4000-8000-000000000003',true),
  ('11111111-1111-4111-8111-111111111103','20000000-0000-4000-8000-000000000002',true),
  ('11111111-1111-4111-8111-111111111104','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111105','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111106','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111107','20000000-0000-4000-8000-000000000003',true),
  ('11111111-1111-4111-8111-111111111108','20000000-0000-4000-8000-000000000005',true),
  ('11111111-1111-4111-8111-111111111109','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111110','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111111','20000000-0000-4000-8000-000000000004',true),
  ('11111111-1111-4111-8111-111111111112','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111113','20000000-0000-4000-8000-000000000002',true),
  ('11111111-1111-4111-8111-111111111114','20000000-0000-4000-8000-000000000001',true),
  ('11111111-1111-4111-8111-111111111115','20000000-0000-4000-8000-000000000003',true),
  ('11111111-1111-4111-8111-111111111116','20000000-0000-4000-8000-000000000005',true)
on conflict do nothing;

insert into public.professional_needs (professional_profile_id, need_id)
select p.id, n.id
from (values
  ('11111111-1111-4111-8111-111111111101'::uuid, array['22000000-0000-4000-8000-000000000001'::uuid,'22000000-0000-4000-8000-000000000002'::uuid]),
  ('11111111-1111-4111-8111-111111111102'::uuid, array['22000000-0000-4000-8000-000000000003'::uuid,'22000000-0000-4000-8000-000000000004'::uuid]),
  ('11111111-1111-4111-8111-111111111103'::uuid, array['22000000-0000-4000-8000-000000000007'::uuid,'22000000-0000-4000-8000-000000000010'::uuid]),
  ('11111111-1111-4111-8111-111111111104'::uuid, array['22000000-0000-4000-8000-000000000008'::uuid,'22000000-0000-4000-8000-000000000010'::uuid]),
  ('11111111-1111-4111-8111-111111111105'::uuid, array['22000000-0000-4000-8000-000000000001'::uuid,'22000000-0000-4000-8000-000000000004'::uuid]),
  ('11111111-1111-4111-8111-111111111106'::uuid, array['22000000-0000-4000-8000-000000000009'::uuid,'22000000-0000-4000-8000-000000000006'::uuid]),
  ('11111111-1111-4111-8111-111111111107'::uuid, array['22000000-0000-4000-8000-000000000008'::uuid,'22000000-0000-4000-8000-000000000005'::uuid]),
  ('11111111-1111-4111-8111-111111111108'::uuid, array['22000000-0000-4000-8000-000000000004'::uuid,'22000000-0000-4000-8000-000000000010'::uuid]),
  ('11111111-1111-4111-8111-111111111109'::uuid, array['22000000-0000-4000-8000-000000000003'::uuid,'22000000-0000-4000-8000-000000000010'::uuid]),
  ('11111111-1111-4111-8111-111111111110'::uuid, array['22000000-0000-4000-8000-000000000006'::uuid,'22000000-0000-4000-8000-000000000009'::uuid]),
  ('11111111-1111-4111-8111-111111111111'::uuid, array['22000000-0000-4000-8000-000000000008'::uuid,'22000000-0000-4000-8000-000000000005'::uuid]),
  ('11111111-1111-4111-8111-111111111112'::uuid, array['22000000-0000-4000-8000-000000000001'::uuid,'22000000-0000-4000-8000-000000000005'::uuid]),
  ('11111111-1111-4111-8111-111111111113'::uuid, array['22000000-0000-4000-8000-000000000007'::uuid]),
  ('11111111-1111-4111-8111-111111111114'::uuid, array['22000000-0000-4000-8000-000000000001'::uuid,'22000000-0000-4000-8000-000000000005'::uuid]),
  ('11111111-1111-4111-8111-111111111115'::uuid, array['22000000-0000-4000-8000-000000000002'::uuid]),
  ('11111111-1111-4111-8111-111111111116'::uuid, array['22000000-0000-4000-8000-000000000010'::uuid])
) p(id, need_ids)
cross join lateral unnest(p.need_ids) n(id)
on conflict do nothing;

insert into public.professional_services
  (professional_profile_id, service_id, title, price_from, currency, duration_minutes)
values
  ('11111111-1111-4111-8111-111111111101','23000000-0000-4000-8000-000000000001','Proceso de terapia individual',26000,'ARS',60),
  ('11111111-1111-4111-8111-111111111102','23000000-0000-4000-8000-000000000007','Consulta psiquiátrica inicial',36000,'ARS',60),
  ('11111111-1111-4111-8111-111111111103','23000000-0000-4000-8000-000000000006','Evaluación psicopedagógica',22000,'ARS',60),
  ('11111111-1111-4111-8111-111111111104','23000000-0000-4000-8000-000000000005','Evaluación neuropsicológica completa',47000,'ARS',75),
  ('11111111-1111-4111-8111-111111111105','23000000-0000-4000-8000-000000000001','Proceso de terapia individual',38000,'ARS',60),
  ('11111111-1111-4111-8111-111111111106','23000000-0000-4000-8000-000000000003','Terapia familiar sistémica',55,'USD',75),
  ('11111111-1111-4111-8111-111111111107','23000000-0000-4000-8000-000000000007','Interconsulta psiquiátrica',19000,'ARS',45),
  ('11111111-1111-4111-8111-111111111108','23000000-0000-4000-8000-000000000009','Plan de rehabilitación ocupacional',24000,'ARS',60),
  ('11111111-1111-4111-8111-111111111109','23000000-0000-4000-8000-000000000001','Acompañamiento en proceso de duelo',68000,'ARS',75),
  ('11111111-1111-4111-8111-111111111110','23000000-0000-4000-8000-000000000002','Terapia de pareja',45000,'ARS',60),
  ('11111111-1111-4111-8111-111111111111','23000000-0000-4000-8000-000000000008','Musicoterapia grupal',39000,'ARS',60),
  ('11111111-1111-4111-8111-111111111112','23000000-0000-4000-8000-000000000001','Terapia individual',32000,'ARS',60),
  ('11111111-1111-4111-8111-111111111113','23000000-0000-4000-8000-000000000006','Orientación psicopedagógica demo',21000,'ARS',60),
  ('11111111-1111-4111-8111-111111111114','23000000-0000-4000-8000-000000000001','Terapia individual demo',27000,'ARS',60),
  ('11111111-1111-4111-8111-111111111115','23000000-0000-4000-8000-000000000007','Interconsulta psiquiátrica demo',41000,'ARS',60),
  ('11111111-1111-4111-8111-111111111116','23000000-0000-4000-8000-000000000009','Rehabilitación ocupacional demo',56000,'ARS',75)
on conflict do nothing;

-- Demo fixtures exercise the catalogue without publishing fees. Unsupported
-- historical professions remain available only as suspended workflow data.
update public.professional_profiles p
set starting_price = null,
    currency = null,
    show_starting_price = false,
    publication_status = case
      when private.has_supported_professional_types(p.id)
        then p.publication_status
      else 'SUSPENDED'
    end,
    published_at = case
      when private.has_supported_professional_types(p.id)
        then p.published_at
      else null
    end,
    is_accepting_leads = case
      when private.has_supported_professional_types(p.id)
        then p.is_accepting_leads
      else false
    end
where p.is_demo;

update public.professional_services ps
set price_from = null,
    currency = null
where exists (
  select 1
  from public.professional_profiles p
  where p.id = ps.professional_profile_id and p.is_demo
);

insert into public.professional_specialties (professional_profile_id, specialty_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       ('24000000-0000-4000-8000-' || lpad((((n - 1) % 10) + 1)::text, 12, '0'))::uuid
from generate_series(1, 16) n
on conflict do nothing;

-- Map the 16 profiles to one audience, modality, city, language, industry and
-- career stage each. Additional online/English/Portuguese rows provide filter coverage.
insert into public.professional_audiences (professional_profile_id, audience_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       ('25000000-0000-4000-8000-' || lpad((((n - 1) % 5) + 1)::text, 12, '0'))::uuid
from generate_series(1, 16) n on conflict do nothing;

insert into public.professional_modalities (professional_profile_id, modality_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       case when n % 3 = 0 then '26000000-0000-4000-8000-000000000003'::uuid
            when n % 2 = 0 then '26000000-0000-4000-8000-000000000001'::uuid
            else '26000000-0000-4000-8000-000000000002'::uuid end
from generate_series(1, 16) n on conflict do nothing;
insert into public.professional_modalities (professional_profile_id, modality_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       '26000000-0000-4000-8000-000000000001'
from generate_series(1, 16) n where n % 2 = 1 on conflict do nothing;

insert into public.professional_locations (professional_profile_id, location_id, is_primary)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       ('27000000-0000-4000-8000-' || lpad((100 + (((n - 1) % 5) + 1))::text, 12, '0'))::uuid,
       true
from generate_series(1, 16) n on conflict do nothing;

insert into public.professional_languages (professional_profile_id, language_id, proficiency)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       '28000000-0000-4000-8000-000000000001', 'NATIVE'
from generate_series(1, 16) n on conflict do nothing;
insert into public.professional_languages (professional_profile_id, language_id, proficiency)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       '28000000-0000-4000-8000-000000000002', 'PROFESSIONAL'
from generate_series(2, 16, 2) n on conflict do nothing;
insert into public.professional_languages (professional_profile_id, language_id, proficiency)
values
  ('11111111-1111-4111-8111-111111111104','28000000-0000-4000-8000-000000000003','CONVERSATIONAL'),
  ('11111111-1111-4111-8111-111111111112','28000000-0000-4000-8000-000000000003','FLUENT')
on conflict do nothing;

insert into public.professional_industries (professional_profile_id, industry_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       ('29000000-0000-4000-8000-' || lpad((((n - 1) % 6) + 1)::text, 12, '0'))::uuid
from generate_series(1, 16) n on conflict do nothing;

insert into public.professional_career_stages (professional_profile_id, career_stage_id)
select ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
       ('2a000000-0000-4000-8000-' || lpad((((n - 1) % 6) + 1)::text, 12, '0'))::uuid
from generate_series(1, 16) n on conflict do nothing;

-- Keep the first six database identities aligned with the demo UI contract.
delete from public.professional_locations
where professional_profile_id = '11111111-1111-4111-8111-111111111105';
insert into public.professional_locations (professional_profile_id, location_id, is_primary)
values ('11111111-1111-4111-8111-111111111105','27000000-0000-4000-8000-000000000102',true)
on conflict do nothing;

delete from public.professional_modalities
where professional_profile_id = '11111111-1111-4111-8111-111111111103'
  and modality_id = '26000000-0000-4000-8000-000000000003';
insert into public.professional_modalities (professional_profile_id, modality_id)
values
  ('11111111-1111-4111-8111-111111111106','26000000-0000-4000-8000-000000000001'),
  ('11111111-1111-4111-8111-111111111106','26000000-0000-4000-8000-000000000002')
on conflict do nothing;

delete from public.professional_languages
where professional_profile_id = '11111111-1111-4111-8111-111111111102'
  and language_id = '28000000-0000-4000-8000-000000000002';
insert into public.professional_languages (professional_profile_id, language_id, proficiency)
values
  ('11111111-1111-4111-8111-111111111101','28000000-0000-4000-8000-000000000002','PROFESSIONAL'),
  ('11111111-1111-4111-8111-111111111103','28000000-0000-4000-8000-000000000002','PROFESSIONAL')
on conflict do nothing;

delete from public.professional_specialties
where professional_profile_id in (
  '11111111-1111-4111-8111-111111111103',
  '11111111-1111-4111-8111-111111111104',
  '11111111-1111-4111-8111-111111111105',
  '11111111-1111-4111-8111-111111111106'
);
insert into public.professional_specialties (professional_profile_id, specialty_id)
values
  ('11111111-1111-4111-8111-111111111103','24000000-0000-4000-8000-000000000001'),
  ('11111111-1111-4111-8111-111111111104','24000000-0000-4000-8000-000000000005'),
  ('11111111-1111-4111-8111-111111111105','24000000-0000-4000-8000-000000000002'),
  ('11111111-1111-4111-8111-111111111106','24000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.professional_career_stages (professional_profile_id, career_stage_id)
values
  ('11111111-1111-4111-8111-111111111102','2a000000-0000-4000-8000-000000000003'),
  ('11111111-1111-4111-8111-111111111102','2a000000-0000-4000-8000-000000000005'),
  ('11111111-1111-4111-8111-111111111103','2a000000-0000-4000-8000-000000000002'),
  ('11111111-1111-4111-8111-111111111104','2a000000-0000-4000-8000-000000000006'),
  ('11111111-1111-4111-8111-111111111105','2a000000-0000-4000-8000-000000000003'),
  ('11111111-1111-4111-8111-111111111106','2a000000-0000-4000-8000-000000000005')
on conflict do nothing;

insert into public.professional_ranking_signals
  (professional_profile_id, availability_score, completeness_score,
   response_score, activity_score, quality_score, plan_boost_points,
   is_sponsored, ranking_version)
select
  ('11111111-1111-4111-8111-1111111111' || lpad(n::text, 2, '0'))::uuid,
  55 + (n % 5) * 8,
  72 + (n % 6) * 4,
  60 + (n % 4) * 9,
  58 + (n % 5) * 7,
  70 + (n % 4) * 6,
  case when n % 3 = 0 then 2 when n % 2 = 0 then 1 else 0 end,
  n in (3, 9),
  'rank-v1'
from generate_series(1, 16) n
on conflict (professional_profile_id) do update set
  availability_score = excluded.availability_score,
  completeness_score = excluded.completeness_score,
  response_score = excluded.response_score,
  activity_score = excluded.activity_score,
  quality_score = excluded.quality_score,
  plan_boost_points = excluded.plan_boost_points,
  is_sponsored = excluded.is_sponsored,
  ranking_version = excluded.ranking_version;

insert into public.articles
  (id, author_profile_id, category_id, title, slug, excerpt, body, tags, takeaways,
   status, seo_title, seo_description, published_at, moderated_at, is_demo)
values
  ('33000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111101','2c000000-0000-4000-8000-000000000001','Elegir sin tener todas las respuestas','elegir-sin-todas-las-respuestas-demo','Una guía breve para convertir la incertidumbre en preguntas que sí se pueden investigar.',
   'Elegir no exige adivinar el futuro: puede empezar por reconocer intereses, condiciones y alternativas, conversar con personas y diseñar experiencias pequeñas antes de comprometer una decisión.

## Separá lo que ya sabés de lo que falta explorar

Antes de buscar más información conviene escribir lo que ya es conocido: intereses declarados, tareas que generan energía y condiciones no negociables como presupuesto o ubicación. Esa lista reduce el terreno real de incertidumbre.

Lo que queda afuera de esa lista es lo que vale la pena investigar activamente, en lugar de seguir dando vueltas sobre lo que ya se sabe.

## Diseñá pasos reversibles antes que una decisión definitiva

Una materia suelta, una certificación corta o una conversación con alguien que ejerce esa profesión aportan evidencia real sin cerrar otras puertas.

Ese tipo de pasos intermedios convierte una decisión abstracta en una serie de decisiones pequeñas y revisables, más fáciles de sostener que una apuesta única.',
   '{decisiones,orientacion}',
   '{"Separá lo que ya sabés de lo que necesitás investigar.","Priorizá pasos reversibles antes de un compromiso definitivo.","Buscá evidencia conversando con quienes ya recorrieron ese camino."}',
   'PUBLISHED','Elegir sin todas las respuestas','Preguntas y experimentos para explorar decisiones educativas.', '2026-02-01 12:00:00+00','2026-02-01 10:00:00+00',true),
  ('33000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111102','2c000000-0000-4000-8000-000000000003','Cómo convertir un cambio en un experimento','convertir-cambio-en-experimento-demo','Una forma práctica de reducir el riesgo cuando estás pensando en una transición profesional.',
   'En lugar de tratar un cambio de carrera como una única decisión irreversible, se puede formular una hipótesis, definir qué evidencia falta y diseñar un experimento acotado.

## Convertí la duda en una hipótesis concreta

"Quiero cambiar de rubro" es difícil de poner a prueba. "Quiero saber si un rol de análisis de datos me resulta sostenible" sí se puede investigar con una acción concreta.

Nombrar la hipótesis con precisión ayuda a decidir qué información falta y evita confundir intuición con evidencia.

## Elegí el experimento más chico que aporte evidencia real

Una conversación con alguien del área, un proyecto breve o una observación del trabajo cotidiano suelen bastar para contrastar la fantasía con la tarea real.

El objetivo no es acertar a la primera, sino acumular información propia que reduzca el riesgo de la decisión siguiente.',
   '{transiciones,carrera}',
   '{"Transformá la duda en una hipótesis que se pueda poner a prueba.","Elegí experimentos pequeños antes de un cambio definitivo.","Cada experimento deja evidencia propia, no sólo intuición."}',
   'PUBLISHED','Cambios profesionales como experimentos','Una aproximación gradual y basada en evidencia para explorar transiciones.', '2026-02-05 12:00:00+00','2026-02-05 10:00:00+00',true),
  ('33000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111103','2c000000-0000-4000-8000-000000000002','Leer una búsqueda laboral con criterio','leer-busqueda-laboral-demo','Qué observar en un aviso antes de adaptar tu postulación y decidir si vale la pena avanzar.',
   'Conviene separar requisitos centrales, señales de contexto y preferencias antes de adaptar una postulación o decidir si vale la pena avanzar.

## Distinguí lo excluyente de lo deseable

Un aviso mezcla condiciones centrales con preferencias del equipo. Separarlas permite entender qué barreras son reales y cuáles admiten matices.

Esa lectura evita descartarse por no cumplir un punto que, en la práctica, no define el proceso.

## Buscá señales de contexto antes de postularte

El tono, las responsabilidades descriptas y la forma de redactar el aviso anticipan parte de la cultura del equipo y del momento que atraviesa el área.

Esas señales también sirven para preparar preguntas propias durante el proceso, en lugar de responder únicamente a lo que pide la empresa.',
   '{empleabilidad,busqueda}',
   '{"Separá requisitos excluyentes de preferencias deseables.","Leé el contexto del aviso, no sólo la lista de tareas.","Preparate preguntas propias antes de avanzar en el proceso."}',
   'PUBLISHED','Cómo leer una búsqueda laboral','Criterios para analizar avisos y preparar postulaciones relevantes.', '2026-02-10 12:00:00+00','2026-02-10 10:00:00+00',true),
  ('33000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111104','2c000000-0000-4000-8000-000000000003','Transición a tecnología: empezar por los roles','transicion-tecnologia-empezar-roles-demo','Tecnología no es un único destino: una primera exploración puede comparar familias de roles.',
   'Tecnología no es un único destino: antes de elegir una formación conviene comparar familias de roles y las tareas reales que implican.

## Comparé tareas, no títulos

Producto, datos, desarrollo, diseño y operaciones requieren combinaciones distintas de capacidades, aunque compartan la etiqueta "tecnología".

Mirar tareas concretas de cada rol evita elegir una formación en base a un nombre atractivo pero poco preciso.

## Contrastá la brecha con tu experiencia actual

Conversar con quienes ejercen esos roles y revisar procesos reales de trabajo ayuda a estimar qué tan lejos está la experiencia previa de ese nuevo camino.

Esa brecha, una vez nombrada, permite elegir una formación acotada en lugar de un recorrido genérico y extenso.',
   '{tecnologia,transiciones}',
   '{"Comparé familias de roles por sus tareas, no por su nombre.","Hablá con quienes ya ejercen el rol que te interesa.","Elegí formación específica según la brecha real, no genérica."}',
   'PUBLISHED','Transición a tecnología y familias de roles','Cómo explorar roles tecnológicos antes de elegir formación.', '2026-02-15 12:00:00+00','2026-02-15 10:00:00+00',true),
  ('33000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111107','2c000000-0000-4000-8000-000000000002','Preparar historias para una entrevista','preparar-historias-entrevista-demo','Una estructura simple para comunicar contexto, decisiones, acciones y resultados sin memorizar discursos.',
   'Prepararse no significa memorizar respuestas perfectas, sino elegir algunas historias que muestren contexto, decisiones, acciones y resultados con precisión.

## Elegí pocas historias, no muchas respuestas

Cuatro o cinco episodios bien elegidos alcanzan para responder preguntas distintas si se conoce bien el contexto, el aporte propio y el resultado obtenido.

Repasar demasiadas respuestas memorizadas suele generar un discurso rígido en lugar de una conversación genuina.

## Estructurá cada historia con cuidado

Contexto, desafío, acción propia, resultado y aprendizaje son suficientes para comunicar una experiencia con claridad, sin exponer información confidencial.

Esa estructura también ayuda a identificar qué historias todavía faltan pulir antes de la entrevista.',
   '{entrevistas,empleabilidad}',
   '{"Elegí pocas historias representativas, no una respuesta por pregunta.","Usá una misma estructura: contexto, acción, resultado, aprendizaje.","Cuidá la información confidencial al elegir tus ejemplos."}',
   'PUBLISHED','Historias claras para entrevistas','Cómo preparar ejemplos concretos para una entrevista laboral.', '2026-02-20 12:00:00+00','2026-02-20 10:00:00+00',true),
  ('33000000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111109','2c000000-0000-4000-8000-000000000004','Primeros meses liderando un equipo','primeros-meses-liderando-demo','Preguntas útiles para ordenar expectativas, acuerdos y aprendizaje al asumir un rol de liderazgo.',
   'Un nuevo rol de liderazgo no exige tener todas las respuestas, sino hacer explícito cómo se van a tomar las decisiones.

## Escuchá antes de reorganizar

Entender el propósito del equipo, sus acuerdos previos y las tensiones existentes evita cambios apresurados que generan más resistencia que resultado.

Las primeras conversaciones individuales suelen aportar más información que cualquier plan armado de antemano.

## Construí un ritmo de seguimiento explícito

Acordar cómo y cuándo se van a revisar prioridades, resultados y obstáculos da previsibilidad al equipo y reduce la ambigüedad del inicio.

Ese ritmo también ayuda a la persona que lidera a corregir el rumbo con información temprana, en lugar de esperar señales tardías.',
   '{liderazgo,equipos}',
   '{"Escuchá al equipo antes de proponer cambios.","Hacé explícito cómo se van a tomar las decisiones.","Construí un ritmo de seguimiento desde el principio."}',
   'PUBLISHED','Primeros meses como líder','Preguntas y acuerdos para iniciar un rol de liderazgo.', '2026-02-25 12:00:00+00','2026-02-25 10:00:00+00',true)
on conflict (id) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  tags = excluded.tags, takeaways = excluded.takeaways,
  status = excluded.status, published_at = excluded.published_at,
  moderated_at = excluded.moderated_at, is_demo = true;

insert into public.institutions
  (id, slug, name, institution_type, summary, website_url, is_demo)
values
  ('44000000-0000-4000-8000-000000000001','instituto-horizonte-demo','Instituto Horizonte Demo','UNIVERSITY','Institución completamente ficticia creada para probar convenios educativos.',null,true),
  ('44000000-0000-4000-8000-000000000002','comunidad-puente-demo','Comunidad Puente Demo','COMMUNITY','Comunidad ficticia utilizada sólo para escenarios de demostración.',null,true)
on conflict (id) do update set name = excluded.name, summary = excluded.summary, is_demo = true;

insert into public.agreements
  (id, institution_id, slug, name, summary, terms_public, status,
   modality_notes, audience_summary, coverage_summary, benefits, eligibility, access_steps,
   discount_percent, quota_total, valid_from, valid_until,
   is_public, is_demo)
values
  ('45000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001','orientacion-estudiantil-demo','Orientación estudiantil demo','Convenio ficticio para probar una propuesta de orientación destinada a estudiantes.','Condiciones ilustrativas sujetas a definición; no constituye una oferta real.','PUBLISHED',
   'Atención online y presencial según profesional.',
   'Estudiantes de grado y de los últimos años de secundario del instituto, en proceso de elegir o revisar una carrera.',
   'Atención remota en todo el país y encuentros presenciales en sede del instituto.',
   '{"Turnos de orientación con arancel reducido","Acceso prioritario a los cupos disponibles","Seguimiento durante todo el ciclo lectivo"}',
   '{"Formar parte de la comunidad educativa del instituto","Presentar la credencial o constancia institucional vigente","Aceptar los términos generales de Universo Psi"}',
   '{"Solicitá el código de convenio en tu institución","Ingresá el código al contactar a un profesional adherido","Coordiná el primer encuentro dentro de los cupos disponibles"}',
   15,40,'2026-01-01','2026-12-31',true,true),
  ('45000000-0000-4000-8000-000000000002','44000000-0000-4000-8000-000000000002','transiciones-comunidad-demo','Transiciones para la comunidad demo','Convenio ficticio para probar acompañamiento en búsqueda y cambio profesional.','Condiciones de demostración sin validez comercial.','PUBLISHED',
   'Atención online.',
   'Personas asociadas a la comunidad que atraviesan una búsqueda laboral o un cambio de rumbo profesional.',
   'Atención remota para personas asociadas en cualquier ubicación.',
   '{"Arancel especial para personas asociadas","Prioridad en la asignación de cupos mensuales","Contenidos exclusivos sobre búsqueda laboral"}',
   '{"Acreditar membresía vigente en la comunidad","Completar el formulario de acceso institucional","Aceptar los términos generales de Universo Psi"}',
   '{"Verificá tu membresía activa en la comunidad","Accedé al enlace institucional compartido por la comunidad","Elegí un profesional adherido y coordiná el primer contacto"}',
   10,60,'2026-01-01','2026-12-31',true,true)
on conflict (id) do update set
  name = excluded.name, summary = excluded.summary, status = excluded.status,
  modality_notes = excluded.modality_notes,
  audience_summary = excluded.audience_summary, coverage_summary = excluded.coverage_summary,
  benefits = excluded.benefits, eligibility = excluded.eligibility, access_steps = excluded.access_steps,
  is_public = excluded.is_public, is_demo = true;

insert into public.agreement_professionals
  (agreement_id, professional_profile_id, status)
values
  ('45000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111101','ACTIVE'),
  ('45000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111105','ACTIVE'),
  ('45000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111102','ACTIVE'),
  ('45000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111103','ACTIVE'),
  ('45000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111106','ACTIVE')
on conflict do nothing;

insert into public.agreement_services (agreement_id, service_id)
values
  ('45000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001'),
  ('45000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000002'),
  ('45000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.reviews
  (id, professional_profile_id, reviewer_display_name, rating, title, body,
   status, moderated_at, is_demo)
values
  ('55000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111101','Persona demo A',5,'Más claridad para explorar','Reseña completamente ficticia: el proceso ayudó a ordenar preguntas y próximos pasos.','APPROVED','2026-03-01 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111102','Persona demo B',4,'Un plan concreto','Reseña ficticia de prueba: pude convertir ideas dispersas en acciones pequeñas.','APPROVED','2026-03-02 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111103','Persona demo C',5,'Búsqueda más enfocada','Reseña ficticia: mejoré el foco de mis postulaciones y la forma de presentar experiencia.','APPROVED','2026-03-03 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111104','Persona demo D',4,'Mapa útil de roles','Reseña ficticia: entendí mejor las diferencias entre roles antes de elegir formación.','APPROVED','2026-03-04 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111105','Persona demo E',5,'Exploración acompañada','Reseña ficticia de demostración: las actividades ayudaron a investigar alternativas.','APPROVED','2026-03-05 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111106','Persona demo F',4,'Cambio por etapas','Reseña ficticia: pude pensar la transición como etapas y no como un salto inmediato.','APPROVED','2026-03-06 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111107','Persona demo G',5,'Práctica muy útil','Reseña ficticia: practicar respuestas me permitió comunicar ejemplos con más claridad.','APPROVED','2026-03-07 12:00:00+00',true),
  ('55000000-0000-4000-8000-000000000008','11111111-1111-4111-8111-111111111109','Persona demo H',4,'Buenas preguntas','Reseña ficticia: las preguntas ayudaron a ordenar un desafío nuevo de liderazgo.','APPROVED','2026-03-08 12:00:00+00',true)
on conflict (id) do update set
  rating = excluded.rating, title = excluded.title, body = excluded.body,
  status = excluded.status, moderated_at = excluded.moderated_at, is_demo = true;

commit;
