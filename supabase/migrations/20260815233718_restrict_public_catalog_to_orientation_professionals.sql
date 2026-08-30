begin;

-- Red Senda publishes only regulated orientation profiles. Historical
-- taxonomies remain stored for referential compatibility, but they cannot be
-- selected for a new profile or cross any public publication boundary.
update public.professional_types
set
  name = case code
    when 'psychology_orientation' then 'Psicólogo/a'
    when 'psychopedagogy' then 'Psicopedagogo/a'
    else name
  end,
  is_active = code in ('psychology_orientation', 'psychopedagogy'),
  updated_at = statement_timestamp();

create or replace function private.has_supported_professional_types(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.professional_profile_types ppt
      join public.professional_types pt on pt.id = ppt.professional_type_id
      where ppt.professional_profile_id = p_profile_id
        and pt.is_active
        and pt.code in ('psychology_orientation', 'psychopedagogy')
    )
    and not exists (
      select 1
      from public.professional_profile_types ppt
      join public.professional_types pt on pt.id = ppt.professional_type_id
      where ppt.professional_profile_id = p_profile_id
        and (
          not pt.is_active
          or pt.code not in ('psychology_orientation', 'psychopedagogy')
        )
    );
$$;

revoke all on function private.has_supported_professional_types(uuid)
  from public, anon, authenticated;
grant execute on function private.has_supported_professional_types(uuid)
  to anon, authenticated, service_role;

-- Taxonomy edits made by an owner must be able to move a live profile back to
-- review without opening publication_status to forged client updates. The
-- workflow marker is accepted only while the SECURITY DEFINER trigger owner is
-- the effective database user.
create or replace function private.guard_professional_profile_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_submission_workflow boolean := false;
  v_taxonomy_workflow boolean := false;
  v_workflow text := coalesce(
    pg_catalog.current_setting(
      'red_senda.professional_profile_workflow',
      true
    ),
    ''
  );
begin
  if tg_op = 'UPDATE' and v_workflow = 'submit_professional_profile' then
    select current_user = pg_catalog.pg_get_userbyid(p.proowner)
    into v_submission_workflow
    from pg_catalog.pg_proc p
    where p.oid = pg_catalog.to_regprocedure(
      'private.submit_professional_profile(uuid)'
    );
  elsif tg_op = 'UPDATE' and v_workflow = 'mark_profile_taxonomy_changed' then
    select current_user = pg_catalog.pg_get_userbyid(p.proowner)
    into v_taxonomy_workflow
    from pg_catalog.pg_proc p
    where p.oid = pg_catalog.to_regprocedure(
      'private.mark_profile_taxonomy_changed()'
    );
  end if;

  if v_submission_workflow then
    new.user_id := old.user_id;
    new.is_demo := old.is_demo;

    if new.publication_status is distinct from old.publication_status
       and not (
         old.publication_status in ('DRAFT', 'REJECTED')
         and new.publication_status = 'PENDING_REVIEW'
         and new.published_at is null
       ) then
      raise exception 'Invalid professional submission transition'
        using errcode = '42501';
    elsif new.publication_status is not distinct from old.publication_status
          and new.published_at is distinct from old.published_at then
      raise exception 'Submission workflow cannot change published_at alone'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if v_taxonomy_workflow then
    if old.publication_status not in ('PUBLISHED', 'PENDING_REVIEW')
       or new.publication_status <> 'PENDING_REVIEW'
       or new.published_at is not null
       or (
         pg_catalog.to_jsonb(new)
           - array[
             'publication_status', 'published_at', 'updated_at',
             'search_vector', 'search_vector_unaccented'
           ]::text[]
       ) is distinct from (
         pg_catalog.to_jsonb(old)
           - array[
             'publication_status', 'published_at', 'updated_at',
             'search_vector', 'search_vector_unaccented'
           ]::text[]
       ) then
      raise exception
        'Invalid taxonomy review transition (old %, new %, published %, content changed %)',
        old.publication_status,
        new.publication_status,
        new.published_at is not null,
        (
          pg_catalog.to_jsonb(new)
            - array[
              'publication_status', 'published_at', 'updated_at',
              'search_vector', 'search_vector_unaccented'
            ]::text[]
        ) is distinct from (
          pg_catalog.to_jsonb(old)
            - array[
              'publication_status', 'published_at', 'updated_at',
              'search_vector', 'search_vector_unaccented'
            ]::text[]
        )
        using errcode = '42501';
    end if;

    return new;
  end if;

  if (select auth.uid()) is not null
     and not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    if tg_op = 'INSERT' then
      new.user_id := (select auth.uid());
      new.publication_status := 'DRAFT';
      new.verification_state := 'NOT_VERIFIED';
      new.published_at := null;
      new.is_demo := false;
    else
      new.user_id := old.user_id;
      new.verification_state := old.verification_state;
      new.is_demo := old.is_demo;

      if old.publication_status in ('PUBLISHED', 'PENDING_REVIEW') and
        row(
          new.slug, new.first_name, new.last_name, new.pronouns, new.avatar_path,
          new.headline, new.bio, new.approach, new.experience_summary,
          new.education_summary, new.years_experience, new.starting_price,
          new.currency, new.show_starting_price, new.availability_status,
          new.next_available_on, new.availability_note, new.linkedin_url,
          new.website_url, new.instagram_url, new.is_accepting_leads
        ) is distinct from row(
          old.slug, old.first_name, old.last_name, old.pronouns, old.avatar_path,
          old.headline, old.bio, old.approach, old.experience_summary,
          old.education_summary, old.years_experience, old.starting_price,
          old.currency, old.show_starting_price, old.availability_status,
          old.next_available_on, old.availability_note, old.linkedin_url,
          old.website_url, old.instagram_url, old.is_accepting_leads
        )
      then
        new.publication_status := 'PENDING_REVIEW';
        new.published_at := null;
      else
        new.publication_status := old.publication_status;
        new.published_at := old.published_at;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_professional_profile_write()
  from public, anon, authenticated;

create or replace function private.mark_profile_taxonomy_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := case
    when tg_op = 'DELETE' then old.professional_profile_id
    else new.professional_profile_id
  end;

  if tg_table_name = 'professional_profile_types' then
    perform private.set_professional_verification_state(v_profile_id);
  end if;

  if (select auth.uid()) is not null
     and private.owns_professional_profile(v_profile_id)
     and not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    perform pg_catalog.set_config(
      'red_senda.professional_profile_workflow',
      'mark_profile_taxonomy_changed',
      true
    );

    begin
      update public.professional_profiles
      set publication_status = 'PENDING_REVIEW',
          published_at = null,
          updated_at = statement_timestamp()
      where id = v_profile_id
        and publication_status in ('PUBLISHED', 'PENDING_REVIEW');
    exception when others then
      perform pg_catalog.set_config(
        'red_senda.professional_profile_workflow',
        '',
        true
      );
      raise;
    end;

    perform pg_catalog.set_config(
      'red_senda.professional_profile_workflow',
      '',
      true
    );
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.mark_profile_taxonomy_changed()
  from public, anon, authenticated;

-- Forward-only production data migration for the clearly fictional pilot
-- fixtures. Production does not rerun seed.sql, so the existing educational
-- demo is reclassified explicitly and keeps the catalogue representative.
delete from public.professional_profile_types ppt
using public.professional_profiles p
where ppt.professional_profile_id = p.id
  and p.is_demo
  and p.id in (
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111113'
  );

insert into public.professional_profile_types (
  professional_profile_id,
  professional_type_id,
  is_primary
)
select p.id, pt.id, true
from public.professional_profiles p
cross join public.professional_types pt
where p.is_demo
  and p.id in (
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111113'
  )
  and pt.code = 'psychopedagogy'
on conflict (professional_profile_id, professional_type_id)
do update set is_primary = true;

delete from public.professional_needs pn
using public.professional_profiles p
where pn.professional_profile_id = p.id
  and p.is_demo
  and p.id = '11111111-1111-4111-8111-111111111103';

insert into public.professional_needs (professional_profile_id, need_id)
select p.id, n.id
from public.professional_profiles p
cross join public.needs n
where p.id = '11111111-1111-4111-8111-111111111103'
  and p.is_demo
  and n.code in ('choose_studies', 'study_doubts')
on conflict do nothing;

delete from public.professional_services ps
using public.professional_profiles p
where ps.professional_profile_id = p.id
  and p.is_demo
  and p.id = '11111111-1111-4111-8111-111111111103';

insert into public.professional_services (
  professional_profile_id,
  service_id,
  title,
  description,
  duration_minutes,
  is_active
)
select
  p.id,
  s.id,
  'Orientación psicopedagógica',
  'Acompañamiento educativo ficticio para la experiencia piloto.',
  60,
  true
from public.professional_profiles p
cross join public.services s
where p.id = '11111111-1111-4111-8111-111111111103'
  and p.is_demo
  and s.code = 'vocational_guidance'
on conflict (professional_profile_id, service_id)
do update set
  title = excluded.title,
  description = excluded.description,
  price_from = null,
  currency = null,
  duration_minutes = excluded.duration_minutes,
  is_active = true;

delete from public.professional_specialties ps
using public.professional_profiles p
where ps.professional_profile_id = p.id
  and p.is_demo
  and p.id = '11111111-1111-4111-8111-111111111103';

insert into public.professional_specialties (
  professional_profile_id,
  specialty_id
)
select p.id, s.id
from public.professional_profiles p
cross join public.specialties s
where p.id = '11111111-1111-4111-8111-111111111103'
  and p.is_demo
  and s.code = 'vocational_exploration'
on conflict do nothing;

update public.professional_profiles p
set headline = case p.id
      when '11111111-1111-4111-8111-111111111103' then
        'Estrategias para aprender, elegir y construir una trayectoria educativa posible'
      else p.headline
    end,
    bio = case p.id
      when '11111111-1111-4111-8111-111111111103' then
        'Perfil ficticio creado para el entorno demo. Acompaña a jóvenes y personas adultas a comprender cómo aprenden, explorar opciones educativas y organizar decisiones de estudio sin respuestas automáticas.'
      else p.bio
    end,
    approach = case p.id
      when '11111111-1111-4111-8111-111111111103' then
        'Trabaja con entrevistas, estrategias de aprendizaje y exploración guiada de alternativas.'
      else p.approach
    end,
    experience_summary = case p.id
      when '11111111-1111-4111-8111-111111111103' then
        'Experiencia ficticia en psicopedagogía y orientación educativa.'
      else p.experience_summary
    end,
    education_summary = case p.id
      when '11111111-1111-4111-8111-111111111103' then
        'Información educativa y credenciales totalmente sintéticas.'
      else p.education_summary
    end,
    starting_price = null,
    currency = null,
    show_starting_price = false,
    updated_at = statement_timestamp()
where p.is_demo
  and p.id in (
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111113'
  );

create or replace function private.is_professional_publicly_visible(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.professional_profiles p
    where p.id = p_profile_id
      and p.publication_status = 'PUBLISHED'
      and private.has_supported_professional_types(p.id)
      and (
        not exists (
          select 1
          from public.professional_profile_types ppt
          join public.professional_types pt on pt.id = ppt.professional_type_id
          where ppt.professional_profile_id = p.id and pt.is_regulated
        )
        or private.calculate_professional_verification_state(p.id) = 'VERIFIED'
      )
  );
$$;

revoke all on function private.is_professional_publicly_visible(uuid)
  from public, anon, authenticated;
grant execute on function private.is_professional_publicly_visible(uuid)
  to anon, authenticated, service_role;

-- Existing unsupported listings must disappear as soon as the migration is
-- applied, not only after a future moderation action.
update public.professional_profiles p
set publication_status = 'SUSPENDED',
    published_at = null,
    is_accepting_leads = false,
    updated_at = statement_timestamp()
where p.publication_status in ('PUBLISHED', 'PENDING_REVIEW')
  and not private.has_supported_professional_types(p.id);

create or replace function private.submit_professional_profile(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional_role_id bigint;
begin
  if (select auth.uid()) is null
     or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted'
      using errcode = '42501';
  end if;

  if not private.has_supported_professional_types(p_profile_id) then
    raise exception 'Only psychology and psychopedagogy profiles can be submitted'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.professional_needs
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.professional_services
    where professional_profile_id = p_profile_id and is_active
  )
  or not exists (
    select 1 from public.professional_modalities
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.professional_languages
    where professional_profile_id = p_profile_id
  )
  or not exists (
    select 1 from public.subscriptions
    where professional_profile_id = p_profile_id
      and status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE')
  ) then
    raise exception 'Profile onboarding is incomplete' using errcode = '23514';
  end if;

  perform pg_catalog.set_config(
    'red_senda.professional_profile_workflow',
    'submit_professional_profile',
    true
  );

  perform private.set_professional_verification_state(p_profile_id);

  update public.professional_profiles
  set publication_status = 'PENDING_REVIEW',
      published_at = null,
      updated_at = statement_timestamp()
  where id = p_profile_id
    and publication_status in ('DRAFT', 'REJECTED');

  if not found then
    raise exception 'Profile cannot be submitted from its current state'
      using errcode = '22023';
  end if;

  perform pg_catalog.set_config(
    'red_senda.professional_profile_workflow',
    '',
    true
  );

  select id into v_professional_role_id
  from public.roles
  where code = 'PROFESSIONAL';

  insert into public.user_roles (user_id, role_id)
  values ((select auth.uid()), v_professional_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function private.submit_professional_profile(uuid)
  from public, anon, authenticated;
grant execute on function private.submit_professional_profile(uuid)
  to authenticated, service_role;

create or replace function private.admin_set_professional_publication(
  p_profile_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;
  if p_status not in ('PUBLISHED', 'REJECTED', 'SUSPENDED') then
    raise exception 'Invalid publication resolution' using errcode = '22023';
  end if;
  if p_status in ('REJECTED', 'SUSPENDED')
     and nullif(trim(p_reason), '') is null then
    raise exception 'A reason is required' using errcode = '23514';
  end if;
  if p_status = 'PUBLISHED'
     and not private.has_supported_professional_types(p_profile_id) then
    raise exception 'Only psychology and psychopedagogy profiles can be published'
      using errcode = '23514';
  end if;

  perform private.set_professional_verification_state(p_profile_id);

  if p_status = 'PUBLISHED'
     and private.calculate_professional_verification_state(p_profile_id) <> 'VERIFIED'
     and exists (
    select 1
    from public.professional_profile_types ppt
    join public.professional_types pt on pt.id = ppt.professional_type_id
    where ppt.professional_profile_id = p_profile_id
      and pt.is_regulated
  ) then
    raise exception 'Regulated professional requires approved credentials'
      using errcode = '23514';
  end if;

  update public.professional_profiles
  set publication_status = p_status,
      published_at = case
        when p_status = 'PUBLISHED'
          then coalesce(published_at, statement_timestamp())
        else null
      end,
      updated_at = statement_timestamp()
  where id = p_profile_id;

  if not found then
    raise exception 'Professional profile not found' using errcode = '22023';
  end if;

  insert into private.audit_log (
    actor_user_id, actor_db_role, action, entity_schema, entity_table,
    entity_id, changed_fields, metadata
  ) values (
    (select auth.uid()),
    coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      session_user
    ),
    'PUBLICATION_STATUS_SET', 'public', 'professional_profiles',
    p_profile_id::text, array['publication_status', 'published_at'],
    jsonb_strip_nulls(
      jsonb_build_object('status', p_status, 'reason', left(p_reason, 1000))
    )
  );
end;
$$;

revoke all on function private.admin_set_professional_publication(uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.admin_set_professional_publication(uuid, text, text)
  to authenticated, service_role;

-- Public profile contracts contain no fees. The legacy storage columns remain
-- private to service workflows so existing data can be migrated separately.
drop function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
);
drop view public.professional_directory;

create view public.professional_directory
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.first_name,
  p.last_name,
  concat_ws(' ', p.first_name, p.last_name) as display_name,
  p.pronouns,
  p.avatar_path,
  p.headline,
  p.bio,
  p.approach,
  p.experience_summary,
  p.education_summary,
  p.years_experience,
  p.availability_status,
  p.next_available_on,
  p.availability_note,
  p.linkedin_url,
  p.website_url,
  p.instagram_url,
  private.visible_professional_verification_state(p.id) as verification_state,
  p.published_at,
  p.is_accepting_leads,
  p.is_demo,
  coalesce((
    select array_agg(x.professional_type_id order by x.professional_type_id)
    from public.professional_profile_types x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as professional_type_ids,
  coalesce((
    select array_agg(x.need_id order by x.need_id)
    from public.professional_needs x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as need_ids,
  coalesce((
    select array_agg(x.service_id order by x.service_id)
    from public.professional_services x
    where x.professional_profile_id = p.id and x.is_active
  ), '{}'::uuid[]) as service_ids,
  coalesce((
    select array_agg(x.specialty_id order by x.specialty_id)
    from public.professional_specialties x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as specialty_ids,
  coalesce((
    select array_agg(x.audience_id order by x.audience_id)
    from public.professional_audiences x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as audience_ids,
  coalesce((
    select array_agg(x.modality_id order by x.modality_id)
    from public.professional_modalities x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as modality_ids,
  coalesce((
    select array_agg(x.location_id order by x.location_id)
    from public.professional_locations x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as location_ids,
  coalesce((
    select array_agg(x.language_id order by x.language_id)
    from public.professional_languages x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as language_ids,
  coalesce((
    select array_agg(x.industry_id order by x.industry_id)
    from public.professional_industries x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as industry_ids,
  coalesce((
    select array_agg(x.career_stage_id order by x.career_stage_id)
    from public.professional_career_stages x
    where x.professional_profile_id = p.id
  ), '{}'::uuid[]) as career_stage_ids,
  coalesce((
    select round(avg(r.rating)::numeric, 2)
    from public.reviews r
    where r.professional_profile_id = p.id and r.status = 'APPROVED'
  ), 0) as review_rating,
  (
    select count(*)
    from public.reviews r
    where r.professional_profile_id = p.id and r.status = 'APPROVED'
  ) as review_count
from public.professional_profiles p
where private.is_professional_publicly_visible(p.id)
  and private.has_supported_professional_types(p.id);

grant select on public.professional_directory to anon, authenticated;

create or replace function public.rank_professionals(
  p_need_ids uuid[] default '{}',
  p_professional_type_ids uuid[] default '{}',
  p_service_ids uuid[] default '{}',
  p_specialty_ids uuid[] default '{}',
  p_audience_ids uuid[] default '{}',
  p_modality_ids uuid[] default '{}',
  p_location_ids uuid[] default '{}',
  p_language_ids uuid[] default '{}',
  p_industry_ids uuid[] default '{}',
  p_career_stage_ids uuid[] default '{}',
  p_search text default null,
  p_search_signature text default '',
  p_limit integer default 24
)
returns table (
  professional_profile_id uuid,
  slug text,
  display_name text,
  headline text,
  verification_state text,
  review_rating numeric,
  review_count bigint,
  is_sponsored boolean,
  ranking_score numeric,
  ranking_version text,
  ranking_components jsonb,
  reasons text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with request_guard as materialized (
    select private.assert_rank_request(
      p_need_ids, p_professional_type_ids, p_service_ids, p_specialty_ids,
      p_audience_ids, p_modality_ids, p_location_ids, p_language_ids,
      p_industry_ids, p_career_stage_ids, null, p_search,
      p_search_signature, p_limit
    ) as allowed
  ), eligible as (
    select d.*,
           coalesce(s.availability_score, 50) as availability_signal,
           coalesce(s.completeness_score, 0) as completeness_signal,
           coalesce(s.response_score, 50) as response_signal,
           coalesce(s.activity_score, 50) as activity_signal,
           coalesce(s.plan_boost_points, 0) as plan_signal,
           coalesce(s.is_sponsored, false) as sponsored_signal,
           coalesce(s.ranking_version, 'rank-v1') as version_signal
    from public.professional_directory d
    join public.professional_profiles search_profile on search_profile.id = d.id
    left join public.professional_ranking_signals s
      on s.professional_profile_id = d.id
    cross join request_guard g
    where g.allowed
      and d.is_accepting_leads
      and private.has_supported_professional_types(d.id)
      and (cardinality(p_need_ids) = 0 or d.need_ids && p_need_ids)
      and (
        cardinality(p_professional_type_ids) = 0
        or d.professional_type_ids && p_professional_type_ids
      )
      and (cardinality(p_service_ids) = 0 or d.service_ids && p_service_ids)
      and (cardinality(p_specialty_ids) = 0 or d.specialty_ids && p_specialty_ids)
      and (cardinality(p_audience_ids) = 0 or d.audience_ids && p_audience_ids)
      and (cardinality(p_modality_ids) = 0 or d.modality_ids && p_modality_ids)
      and (cardinality(p_location_ids) = 0 or d.location_ids && p_location_ids)
      and (cardinality(p_language_ids) = 0 or d.language_ids && p_language_ids)
      and (cardinality(p_industry_ids) = 0 or d.industry_ids && p_industry_ids)
      and (
        cardinality(p_career_stage_ids) = 0
        or d.career_stage_ids && p_career_stage_ids
      )
      and (
        nullif(trim(p_search), '') is null
        or search_profile.search_vector_unaccented @@
          websearch_to_tsquery(
            'private.spanish_unaccent'::regconfig,
            trim(p_search)
          )
      )
  ), scored as (
    select e.*,
      round((
        47 * case when cardinality(p_need_ids) = 0 then 1 else
          (
            select count(*)::numeric / cardinality(p_need_ids)
            from unnest(p_need_ids) x where x = any(e.need_ids)
          )
        end
        + 20 * case
          when cardinality(p_professional_type_ids)
             + cardinality(p_service_ids)
             + cardinality(p_specialty_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_professional_type_ids) x where x = any(e.professional_type_ids))
            + (select count(*) from unnest(p_service_ids) x where x = any(e.service_ids))
            + (select count(*) from unnest(p_specialty_ids) x where x = any(e.specialty_ids))
          )::numeric / nullif(
            cardinality(p_professional_type_ids)
            + cardinality(p_service_ids)
            + cardinality(p_specialty_ids),
            0
          )
        end
        + 15 * case
          when cardinality(p_modality_ids) + cardinality(p_location_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_modality_ids) x where x = any(e.modality_ids))
            + (select count(*) from unnest(p_location_ids) x where x = any(e.location_ids))
          )::numeric / nullif(
            cardinality(p_modality_ids) + cardinality(p_location_ids), 0
          )
        end
        + 10 * case
          when cardinality(p_audience_ids) + cardinality(p_career_stage_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_audience_ids) x where x = any(e.audience_ids))
            + (select count(*) from unnest(p_career_stage_ids) x where x = any(e.career_stage_ids))
          )::numeric / nullif(
            cardinality(p_audience_ids) + cardinality(p_career_stage_ids), 0
          )
        end
        + 8 * case
          when cardinality(p_language_ids) + cardinality(p_industry_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_language_ids) x where x = any(e.language_ids))
            + (select count(*) from unnest(p_industry_ids) x where x = any(e.industry_ids))
          )::numeric / nullif(
            cardinality(p_language_ids) + cardinality(p_industry_ids), 0
          )
        end
      )::numeric, 3) as relevance_score,
      round(abs(mod(pg_catalog.hashtextextended(
        e.id::text || current_date::text || coalesce(p_search_signature, ''), 0
      )::numeric, 1000)) / 1000, 3) as rotation_score
    from eligible e
  ), ranked as (
    select s.*,
      round(
        s.relevance_score * 0.78
        + s.availability_signal * 0.06
        + case when s.verification_state = 'VERIFIED' then 5 else 0 end
        + s.completeness_signal * 0.04
        + s.response_signal * 0.025
        + s.activity_signal * 0.015
        + least(s.plan_signal, 2)
        + s.rotation_score,
        3
      ) as total_score
    from scored s
  ), presentation as (
    select ranked.*,
           row_number() over (
             partition by sponsored_signal
             order by total_score desc, id
           ) as lane_position
    from ranked
  )
  select r.id, r.slug, r.display_name, r.headline, r.verification_state,
         r.review_rating, r.review_count, r.sponsored_signal, r.total_score,
         r.version_signal,
         jsonb_build_object(
           'relevance', round(r.relevance_score * 0.78, 3),
           'availability', round(r.availability_signal * 0.06, 3),
           'verification', case when r.verification_state = 'VERIFIED' then 5 else 0 end,
           'completeness', round(r.completeness_signal * 0.04, 3),
           'response', round(r.response_signal * 0.025, 3),
           'activity', round(r.activity_signal * 0.015, 3),
           'plan', least(r.plan_signal, 2),
           'rotation', r.rotation_score
         ),
         array_remove(array[
           case when cardinality(p_need_ids) > 0 and r.need_ids && p_need_ids
             then 'Acompaña la necesidad seleccionada' end,
           case when cardinality(p_modality_ids) > 0 and r.modality_ids && p_modality_ids
             then 'Ofrece la modalidad elegida' end,
           case when cardinality(p_career_stage_ids) > 0 and r.career_stage_ids && p_career_stage_ids
             then 'Trabaja con esta etapa profesional' end,
           case when r.verification_state = 'VERIFIED'
             then 'Credenciales revisadas por Red Senda' end
         ]::text[], null)
  from presentation r
  where not r.sponsored_signal or r.lane_position <= 3
  order by r.sponsored_signal desc, r.total_score desc, r.id
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  text, text, integer
) from public;
grant execute on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  text, text, integer
) to anon, authenticated, service_role;

drop function public.my_professional_profile();
create or replace function public.my_professional_profile()
returns table (
  id uuid,
  slug text,
  first_name text,
  last_name text,
  pronouns text,
  avatar_path text,
  headline text,
  bio text,
  approach text,
  experience_summary text,
  education_summary text,
  years_experience smallint,
  availability_status text,
  next_available_on date,
  availability_note text,
  linkedin_url text,
  website_url text,
  instagram_url text,
  publication_status text,
  verification_state text,
  published_at timestamptz,
  is_accepting_leads boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    q.id, q.slug, q.first_name, q.last_name, q.pronouns, q.avatar_path,
    q.headline, q.bio, q.approach, q.experience_summary, q.education_summary,
    q.years_experience, q.availability_status, q.next_available_on,
    q.availability_note, q.linkedin_url, q.website_url, q.instagram_url,
    q.publication_status, q.verification_state, q.published_at,
    q.is_accepting_leads, q.created_at, q.updated_at
  from private.my_professional_profile() q;
$$;

revoke all on function public.my_professional_profile() from public, anon;
grant execute on function public.my_professional_profile()
  to authenticated, service_role;

drop function public.admin_pending_professional_profiles(integer);
create or replace function public.admin_pending_professional_profiles(
  p_limit integer default 50
)
returns table (
  id uuid,
  slug text,
  first_name text,
  last_name text,
  headline text,
  bio text,
  approach text,
  experience_summary text,
  education_summary text,
  years_experience smallint,
  verification_state text,
  publication_status text,
  updated_at timestamptz,
  professional_type_names text[],
  has_regulated_type boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    q.id, q.slug, q.first_name, q.last_name, q.headline, q.bio, q.approach,
    q.experience_summary, q.education_summary, q.years_experience,
    q.verification_state, q.publication_status, q.updated_at,
    q.professional_type_names, q.has_regulated_type
  from private.admin_pending_professional_profiles(p_limit) q;
$$;

revoke all on function public.admin_pending_professional_profiles(integer)
  from public, anon;
grant execute on function public.admin_pending_professional_profiles(integer)
  to authenticated, service_role;

revoke select (starting_price, currency, show_starting_price)
  on public.professional_profiles from anon, authenticated;
revoke insert (starting_price, currency, show_starting_price)
  on public.professional_profiles from authenticated;
revoke update (starting_price, currency, show_starting_price)
  on public.professional_profiles from authenticated;

revoke select on public.professional_services from anon, authenticated;
grant select (
  professional_profile_id, service_id, title, description, duration_minutes,
  is_active, created_at, updated_at
) on public.professional_services to anon, authenticated;

drop policy reviews_public_or_owner_read on public.reviews;
create policy reviews_public_or_owner_read
on public.reviews for select to anon, authenticated
using (
  (
    status = 'APPROVED'
    and private.is_professional_publicly_visible(professional_profile_id)
  )
  or (
    (select auth.uid()) is not null
    and reviewer_user_id = (select auth.uid())
  )
  or private.has_any_role(array['ADMIN', 'SUPERADMIN', 'EDITOR'])
);

comment on view public.professional_directory is
  'Public orientation-professional directory. Fees are deliberately excluded.';
comment on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  text, text, integer
) is
  'Ranks only psychologist and psychopedagogue profiles without exposing or accepting fee data.';

commit;
