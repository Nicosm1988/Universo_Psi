\set ON_ERROR_STOP on

begin;

do $$
declare
  v_index_definition text;
  v_plan json;
begin
  if not exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent' and n.nspname = 'extensions'
  ) then
    raise exception 'unaccent is not installed in the extensions schema';
  end if;

  if to_tsvector(
    'private.spanish_unaccent'::regconfig,
    'Tomás acompaña orientación y tecnología'
  ) is distinct from to_tsvector(
    'private.spanish_unaccent'::regconfig,
    'Tomas acompana orientacion y tecnologia'
  ) then
    raise exception 'Spanish search configuration is not accent-insensitive';
  end if;

  if not exists (
    select 1
    from pg_attribute a
    where a.attrelid = 'public.professional_profiles'::regclass
      and a.attname = 'search_vector_unaccented'
      and a.attgenerated = 's'
      and not a.attisdropped
  ) then
    raise exception 'Accent-insensitive search vector is not stored-generated';
  end if;

  select pg_get_indexdef('public.professional_profiles_search_unaccented_idx'::regclass)
  into v_index_definition;
  if v_index_definition not like '%USING gin (search_vector_unaccented)%' then
    raise exception 'Accent-insensitive search vector is missing its GIN index: %',
      v_index_definition;
  end if;

  if (
    select p.prosecdef or p.provolatile <> 's'
    from pg_proc p
    where p.oid = 'public.rank_professionals(uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],uuid[],text,text,integer)'::regprocedure
  ) then
    raise exception 'rank_professionals changed its invoker/stable contract';
  end if;

  if not has_column_privilege(
    'anon',
    'public.professional_profiles',
    'search_vector_unaccented',
    'SELECT'
  ) or not has_column_privilege(
    'authenticated',
    'public.professional_profiles',
    'search_vector_unaccented',
    'SELECT'
  ) then
    raise exception 'RPC callers cannot read the indexed search column';
  end if;

  if has_column_privilege(
    'anon',
    'public.professional_profiles',
    'search_vector_unaccented',
    'UPDATE'
  ) or has_column_privilege(
    'authenticated',
    'public.professional_profiles',
    'search_vector_unaccented',
    'UPDATE'
  ) then
    raise exception 'A client role can update the generated search column';
  end if;

  set local enable_seqscan = off;
  execute $plan$
    explain (format json, costs off)
    select p.id
    from public.professional_profiles p
    where p.search_vector_unaccented @@
      websearch_to_tsquery(
        'private.spanish_unaccent'::regconfig,
        'tomas tecnologia'
      )
  $plan$ into v_plan;
  if v_plan::text not like '%professional_profiles_search_unaccented_idx%' then
    raise exception 'Search plan does not use the accent-insensitive GIN index: %',
      v_plan;
  end if;
end;
$$;

select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

do $$
declare
  v_accented uuid[];
  v_unaccented uuid[];
begin
  select array_agg(r.professional_profile_id order by r.professional_profile_id)
  into v_accented
  from public.rank_professionals(p_search => 'Inés psicopedagogía') r;

  select array_agg(r.professional_profile_id order by r.professional_profile_id)
  into v_unaccented
  from public.rank_professionals(p_search => 'ines psicopedagogia') r;

  if v_unaccented is distinct from v_accented or not (
    '11111111-1111-4111-8111-111111111103'::uuid = any(v_unaccented)
  ) then
    raise exception 'Accented and unaccented RPC searches differ: %, %',
      v_accented, v_unaccented;
  end if;

  if not exists (
    select 1
    from public.rank_professionals(
      p_need_ids => array['22000000-0000-4000-8000-000000000001'::uuid],
      p_modality_ids => array['26000000-0000-4000-8000-000000000001'::uuid],
      p_search => 'ines psicopedagogia'
    ) r
    where r.professional_profile_id = '11111111-1111-4111-8111-111111111103'
  ) then
    raise exception 'Search no longer composes with categorical filters';
  end if;

  if exists (
    select 1
    from public.rank_professionals(
      p_need_ids => array['22000000-0000-4000-8000-000000000004'::uuid],
      p_search => 'ines psicopedagogia'
    ) r
    where r.professional_profile_id = '11111111-1111-4111-8111-111111111103'
  ) then
    raise exception 'Search bypassed a non-matching categorical filter';
  end if;

  if exists (
    select 1
    from public.rank_professionals(p_search => 'transicion tecnologia') r
    where r.professional_profile_id = '11111111-1111-4111-8111-111111111104'
  ) then
    raise exception 'Search exposed an unsupported professional type';
  end if;
end;
$$;

rollback;
