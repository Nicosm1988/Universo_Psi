begin;

-- Competitive audit of redpsi.com.ar's professional directory found filter
-- categories (enfoques terapéuticos, idiomas, modalidad, temáticas) with no
-- equivalent row in our taxonomy tables. Our 12 professional_types already
-- exceed RedPsi's 4, so this migration only fills the taxonomy gaps —
-- additive, idempotent (on conflict do update), no destructive changes.

insert into public.specialties (id, code, slug, name, sort_order)
values
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

insert into public.languages (id, code, name, sort_order)
values
  ('28000000-0000-4000-8000-000000000004', 'de', 'Alemán', 40),
  ('28000000-0000-4000-8000-000000000005', 'sign_language', 'Lengua de señas', 50)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.modalities (id, code, name, sort_order)
values
  ('26000000-0000-4000-8000-000000000004', 'HOME_VISIT', 'A domicilio', 40)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.services (id, code, slug, name, description, sort_order)
values
  ('23000000-0000-4000-8000-000000000011', 'group_therapy', 'terapia-grupal', 'Terapia grupal', 'Proceso terapéutico en grupo.', 110)
on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = true;

insert into public.needs (id, code, slug, name, short_description, sort_order)
values
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

commit;
