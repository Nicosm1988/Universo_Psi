begin;

-- Keep Spanish stemming while normalizing diacritics before lexemes are
-- indexed. The configuration lives outside the exposed Data API schema.
create extension if not exists unaccent with schema extensions;

create text search configuration private.spanish_unaccent
  (copy = pg_catalog.spanish);

alter text search configuration private.spanish_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, pg_catalog.spanish_stem;

alter table public.professional_profiles
  add column search_vector_unaccented tsvector generated always as (
    to_tsvector(
      'private.spanish_unaccent'::regconfig,
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' ||
      coalesce(approach, '') || ' ' || coalesce(experience_summary, '')
    )
  ) stored;

create index professional_profiles_search_unaccented_idx
  on public.professional_profiles using gin(search_vector_unaccented);

comment on column public.professional_profiles.search_vector_unaccented is
  'Spanish full-text search vector with diacritics normalized through unaccent.';

-- rank_professionals stays SECURITY INVOKER. The additional base-table join
-- remains subject to professional_profiles RLS and only supplies the indexed
-- vector; professional_directory continues to define public eligibility.
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
  p_budget_max numeric default null,
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
  starting_price numeric,
  currency text,
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
      p_industry_ids, p_career_stage_ids, p_budget_max, p_search,
      p_search_signature, p_limit
    ) as allowed
  ), eligible as (
    select d.*, coalesce(s.availability_score, 50) as availability_signal,
           coalesce(s.completeness_score, 0) as completeness_signal,
           coalesce(s.response_score, 50) as response_signal,
           coalesce(s.activity_score, 50) as activity_signal,
           coalesce(s.plan_boost_points, 0) as plan_signal,
           coalesce(s.is_sponsored, false) as sponsored_signal,
           coalesce(s.ranking_version, 'rank-v1') as version_signal
    from public.professional_directory d
    join public.professional_profiles search_profile on search_profile.id = d.id
    left join public.professional_ranking_signals s on s.professional_profile_id = d.id
    cross join request_guard g
    where g.allowed and d.is_accepting_leads
      and (cardinality(p_need_ids) = 0 or d.need_ids && p_need_ids)
      and (cardinality(p_professional_type_ids) = 0 or d.professional_type_ids && p_professional_type_ids)
      and (cardinality(p_service_ids) = 0 or d.service_ids && p_service_ids)
      and (cardinality(p_specialty_ids) = 0 or d.specialty_ids && p_specialty_ids)
      and (cardinality(p_audience_ids) = 0 or d.audience_ids && p_audience_ids)
      and (cardinality(p_modality_ids) = 0 or d.modality_ids && p_modality_ids)
      and (cardinality(p_location_ids) = 0 or d.location_ids && p_location_ids)
      and (cardinality(p_language_ids) = 0 or d.language_ids && p_language_ids)
      and (cardinality(p_industry_ids) = 0 or d.industry_ids && p_industry_ids)
      and (cardinality(p_career_stage_ids) = 0 or d.career_stage_ids && p_career_stage_ids)
      and (p_budget_max is null or d.starting_price is null or d.starting_price <= p_budget_max)
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
        40 * case when cardinality(p_need_ids) = 0 then 1 else
          (select count(*)::numeric / cardinality(p_need_ids) from unnest(p_need_ids) x where x = any(e.need_ids)) end
        + 20 * case
          when cardinality(p_professional_type_ids) + cardinality(p_service_ids) + cardinality(p_specialty_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_professional_type_ids) x where x = any(e.professional_type_ids)) +
            (select count(*) from unnest(p_service_ids) x where x = any(e.service_ids)) +
            (select count(*) from unnest(p_specialty_ids) x where x = any(e.specialty_ids))
          )::numeric / nullif(cardinality(p_professional_type_ids) + cardinality(p_service_ids) + cardinality(p_specialty_ids), 0)
        end
        + 15 * case
          when cardinality(p_modality_ids) + cardinality(p_location_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_modality_ids) x where x = any(e.modality_ids)) +
            (select count(*) from unnest(p_location_ids) x where x = any(e.location_ids))
          )::numeric / nullif(cardinality(p_modality_ids) + cardinality(p_location_ids), 0)
        end
        + 10 * case
          when cardinality(p_audience_ids) + cardinality(p_career_stage_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_audience_ids) x where x = any(e.audience_ids)) +
            (select count(*) from unnest(p_career_stage_ids) x where x = any(e.career_stage_ids))
          )::numeric / nullif(cardinality(p_audience_ids) + cardinality(p_career_stage_ids), 0)
        end
        + 8 * case
          when cardinality(p_language_ids) + cardinality(p_industry_ids) = 0 then 1
          else (
            (select count(*) from unnest(p_language_ids) x where x = any(e.language_ids)) +
            (select count(*) from unnest(p_industry_ids) x where x = any(e.industry_ids))
          )::numeric / nullif(cardinality(p_language_ids) + cardinality(p_industry_ids), 0)
        end
        + 7 * case when p_budget_max is null or e.starting_price is null or e.starting_price <= p_budget_max then 1 else 0 end
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
         r.starting_price, r.currency, r.review_rating, r.review_count,
         r.sponsored_signal, r.total_score, r.version_signal,
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
           case when cardinality(p_need_ids) > 0 and r.need_ids && p_need_ids then 'Acompaña la necesidad seleccionada' end,
           case when cardinality(p_modality_ids) > 0 and r.modality_ids && p_modality_ids then 'Ofrece la modalidad elegida' end,
           case when cardinality(p_career_stage_ids) > 0 and r.career_stage_ids && p_career_stage_ids then 'Trabaja con esta etapa profesional' end,
           case when r.verification_state = 'VERIFIED' then 'Credenciales revisadas por Red Senda' end
         ]::text[], null)
  from presentation r
  where not r.sponsored_signal or r.lane_position <= 3
  order by r.sponsored_signal desc, r.total_score desc, r.id
  limit least(greatest(p_limit, 1), 50);
$$;

-- The RPC is invoker-safe and needs column access for the indexed join. No
-- write capability or additional row visibility is granted.
grant select (search_vector_unaccented)
  on public.professional_profiles to anon, authenticated;

revoke all on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) from public;
grant execute on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) to anon, authenticated, service_role;

commit;
