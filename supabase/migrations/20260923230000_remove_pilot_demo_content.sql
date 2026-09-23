begin;

-- ---------------------------------------------------------------------------
-- Vaciado del contenido piloto
--
-- El sitio pasa a su dominio propio y arranca sin contenido ficticio. Se borra
-- únicamente lo que `seed.sql` marcó con `is_demo = true`.
--
-- Por qué ese filtro es seguro:
--
--   1. La taxonomía sembrada (tipos profesionales, necesidades, servicios,
--      especialidades, audiencias, modalidades, ubicaciones, idiomas, industrias,
--      etapas y planes) se insertó SIN `is_demo`, de modo que conserva el valor
--      por defecto `false`. Es el vocabulario del buscador y no se toca.
--   2. Los perfiles demo no tienen usuario de autenticación: `seed.sql` los creó
--      «sin auth users, contraseñas, correos ni PII real». Borrarlos no puede
--      eliminar la cuenta de una persona real.
--
-- Las dependencias (taxonomías por perfil, disponibilidad, señales de ranking,
-- métricas, reseñas, convenios por profesional y servicios de convenio) caen por
-- `on delete cascade` desde sus tablas padre.
-- ---------------------------------------------------------------------------

-- Reseñas ficticias que cuelgan de perfiles reales, si las hubiera.
delete from public.reviews where is_demo;

-- Catálogo profesional ficticio. Arrastra sus taxonomías, disponibilidad,
-- señales de ranking, métricas y reseñas asociadas.
delete from public.professional_profiles where is_demo;

-- Recursos y convenios: además de vaciarse, las secciones salen del producto.
delete from public.articles where is_demo;
delete from public.agreements where is_demo;
delete from public.institutions where is_demo;

-- Deja constancia de que el vaciado corrió y de que nada real quedó alcanzado.
do $$
declare
  v_profiles integer;
  v_articles integer;
  v_agreements integer;
begin
  select count(*) into v_profiles from public.professional_profiles where is_demo;
  select count(*) into v_articles from public.articles where is_demo;
  select count(*) into v_agreements from public.agreements where is_demo;

  if v_profiles <> 0 or v_articles <> 0 or v_agreements <> 0 then
    raise exception 'Quedó contenido demo sin borrar: % perfiles, % artículos, % convenios',
      v_profiles, v_articles, v_agreements;
  end if;

  raise notice 'Contenido piloto eliminado. Perfiles reales restantes: %',
    (select count(*) from public.professional_profiles);
end;
$$;

commit;
