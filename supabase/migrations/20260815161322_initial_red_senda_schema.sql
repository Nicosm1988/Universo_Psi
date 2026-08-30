begin;

-- Red Senda's exposed API lives in public. Sensitive data and privileged
-- helpers are deliberately isolated in private and are never added to the
-- PostgREST exposed-schemas list.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Identity and authorization
-- ---------------------------------------------------------------------------

create table public.roles (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z][A-Z_]{1,31}$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  avatar_path text,
  locale text not null default 'es-AR',
  terms_version text,
  terms_accepted_at timestamptz,
  marketing_consent boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((terms_version is null) = (terms_accepted_at is null))
);

-- Legal acceptance is recorded append-only with a server timestamp. The
-- columns on user_profiles are a convenience cache and are not directly
-- writable by authenticated clients.
create table private.legal_document_versions (
  document_type text not null check (document_type in ('TERMS', 'PRIVACY')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}(?:\.[0-9]+)?$'),
  document_path text not null check (document_path ~ '^/' and document_path !~ '[?#]'),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  is_current boolean not null default false,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (document_type, version)
);
create unique index legal_document_versions_one_current_idx
  on private.legal_document_versions(document_type) where is_current;

insert into private.legal_document_versions (
  document_type, version, document_path, content_sha256, is_current, published_at
) values
  (
    'TERMS', '2026-08', '/terminos',
    'c545e68aa1c08fab571b731472107406be7b930cbf95d3a49ea74e6b3c305d58',
    true, timestamptz '2026-08-01 00:00:00+00'
  ),
  (
    'PRIVACY', '2026-08', '/privacidad',
    'e968b75b3a571a80d29c00db13b457de419890f6f43a77374a4ac68feeb4ec88',
    true, timestamptz '2026-08-01 00:00:00+00'
  );

create table private.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  document_type text not null check (document_type in ('TERMS', 'PRIVACY')),
  document_version text not null,
  accepted_at timestamptz not null default statement_timestamp(),
  source text not null default 'AUTHENTICATED_UI'
    check (source in ('AUTHENTICATED_UI', 'SIGNUP_BACKEND')),
  created_at timestamptz not null default now(),
  foreign key (document_type, document_version)
    references private.legal_document_versions(document_type, version) on delete restrict,
  unique (user_id, document_type, document_version)
);
create index legal_acceptances_user_time_idx
  on private.legal_acceptances(user_id, accepted_at desc);

create table public.user_roles (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_role_id_idx on public.user_roles(role_id, user_id);
create index user_roles_assigned_by_idx on public.user_roles(assigned_by) where assigned_by is not null;

-- Authorization primitives belong to the migration, not optional demo seed.
insert into public.roles (code, description)
values
  ('USER', 'Authenticated person using Red Senda'),
  ('PROFESSIONAL', 'Owner of a professional profile'),
  ('EDITOR', 'Content moderator'),
  ('ADMIN', 'Operational administrator'),
  ('SUPERADMIN', 'Critical configuration and role administrator')
on conflict (code) do update set description = excluded.description;

create or replace function private.has_any_role(p_role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid())
        and r.code = any (p_role_codes)
    );
$$;

revoke all on function private.has_any_role(text[]) from public, anon, authenticated;
grant execute on function private.has_any_role(text[]) to anon, authenticated, service_role;

create or replace function private.has_current_legal_acceptance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from private.legal_document_versions d
      where d.is_current and d.published_at <= statement_timestamp()
    )
    and not exists (
      select 1
      from private.legal_document_versions d
      where d.is_current
        and d.published_at <= statement_timestamp()
        and not exists (
          select 1
          from private.legal_acceptances a
          where a.user_id = (select auth.uid())
            and a.document_type = d.document_type
            and a.document_version = d.version
        )
    );
$$;

revoke all on function private.has_current_legal_acceptance()
  from public, anon, authenticated;
grant execute on function private.has_current_legal_acceptance()
  to authenticated, service_role;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_role_id bigint;
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100), '')
  )
  on conflict (id) do nothing;

  select id into v_user_role_id from public.roles where code = 'USER';
  if v_user_role_id is null then
    raise exception 'Required USER role has not been seeded';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (new.id, v_user_role_id)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Administrable taxonomies
-- ---------------------------------------------------------------------------

create table public.professional_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  description text,
  is_regulated boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credential_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_rules (
  professional_type_id uuid not null references public.professional_types(id) on delete cascade,
  credential_type_id uuid not null references public.credential_types(id) on delete cascade,
  requirement_level text not null check (requirement_level in ('REQUIRED', 'OPTIONAL', 'JURISDICTIONAL')),
  jurisdiction_required boolean not null default false,
  expires_after_months smallint check (expires_after_months is null or expires_after_months > 0),
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (professional_type_id, credential_type_id)
);

create index verification_rules_credential_type_idx
  on public.verification_rules(credential_type_id, professional_type_id);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  short_description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modalities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('ONLINE', 'IN_PERSON', 'HYBRID')),
  name text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.locations(id) on delete restrict,
  kind text not null check (kind in ('COUNTRY', 'PROVINCE', 'CITY')),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  full_name text not null check (char_length(full_name) between 2 and 240),
  timezone text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (parent_id, slug),
  check ((kind = 'COUNTRY' and parent_id is null) or (kind <> 'COUNTRY' and parent_id is not null))
);

create index locations_parent_id_idx on public.locations(parent_id) where parent_id is not null;
create index locations_country_kind_idx on public.locations(country_code, kind, name);

create table public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  name text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plans and subscriptions
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z_]{1,31}$'),
  name text not null,
  description text,
  price_amount numeric(12,2) check (price_amount is null or price_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null check (billing_interval in ('MONTH', 'YEAR')),
  pricing_status text not null default 'DRAFT' check (pricing_status in ('DRAFT', 'PUBLISHED')),
  monthly_lead_quota integer check (monthly_lead_quota is null or monthly_lead_quota >= 0),
  ranking_boost_points numeric(4,2) not null default 0 check (ranking_boost_points between 0 and 2),
  visibility_score smallint not null default 0 check (visibility_score between 0 and 100),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_entitlements (
  plan_id uuid not null references public.plans(id) on delete cascade,
  entitlement_code text not null check (entitlement_code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  enabled boolean not null default true,
  limit_value numeric,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, entitlement_code)
);

-- ---------------------------------------------------------------------------
-- Professional directory
-- ---------------------------------------------------------------------------

create table public.professional_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.user_profiles(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  pronouns text check (pronouns is null or char_length(pronouns) <= 40),
  avatar_path text,
  headline text not null check (char_length(headline) between 10 and 180),
  bio text not null check (char_length(bio) between 40 and 6000),
  approach text,
  experience_summary text,
  education_summary text,
  years_experience smallint not null default 0 check (years_experience between 0 and 80),
  starting_price numeric(12,2) check (starting_price is null or starting_price >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  show_starting_price boolean not null default true,
  availability_status text not null default 'ASK' check (availability_status in ('AVAILABLE', 'LIMITED', 'WAITLIST', 'ASK')),
  next_available_on date,
  availability_note text,
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  website_url text check (website_url is null or website_url ~ '^https://'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  publication_status text not null default 'DRAFT'
    check (publication_status in ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED')),
  verification_state text not null default 'NOT_VERIFIED'
    check (verification_state in ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  published_at timestamptz,
  is_accepting_leads boolean not null default true,
  is_demo boolean not null default false,
  search_vector tsvector generated always as (
    to_tsvector(
      'spanish',
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' ||
      coalesce(approach, '') || ' ' || coalesce(experience_summary, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((starting_price is null and currency is null) or (starting_price is not null and currency is not null)),
  check ((publication_status = 'PUBLISHED' and published_at is not null) or publication_status <> 'PUBLISHED')
);

create index professional_profiles_user_id_idx on public.professional_profiles(user_id) where user_id is not null;
create index professional_profiles_published_idx
  on public.professional_profiles(publication_status, is_accepting_leads, updated_at desc, id)
  where publication_status = 'PUBLISHED';
create index professional_profiles_search_idx on public.professional_profiles using gin(search_vector);
create index professional_profiles_slug_trgm_idx
  on public.professional_profiles using gin(slug extensions.gin_trgm_ops);

create or replace function private.owns_professional_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.professional_profiles p
      where p.id = p_profile_id and p.user_id = (select auth.uid())
    );
$$;

revoke all on function private.owns_professional_profile(uuid) from public, anon, authenticated;
grant execute on function private.owns_professional_profile(uuid) to authenticated, service_role;

create or replace function private.guard_professional_profile_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
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

      if old.publication_status in ('PUBLISHED', 'PENDING_REVIEW') and (
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
        or new.publication_status = 'PENDING_REVIEW'
      ) then
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

revoke all on function private.guard_professional_profile_write() from public, anon, authenticated;

create trigger professional_profiles_guard_write
before insert or update on public.professional_profiles
for each row execute function private.guard_professional_profile_write();

create table public.professional_profile_types (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  professional_type_id uuid not null references public.professional_types(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, professional_type_id)
);
create unique index professional_profile_types_one_primary_idx
  on public.professional_profile_types(professional_profile_id) where is_primary;
create index professional_profile_types_type_idx
  on public.professional_profile_types(professional_type_id, professional_profile_id);

create table public.professional_needs (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, need_id)
);
create index professional_needs_need_idx on public.professional_needs(need_id, professional_profile_id);

create table public.professional_services (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  title text,
  description text,
  price_from numeric(12,2) check (price_from is null or price_from >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  duration_minutes smallint check (duration_minutes is null or duration_minutes between 15 and 480),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (professional_profile_id, service_id),
  check ((price_from is null and currency is null) or (price_from is not null and currency is not null))
);
create index professional_services_service_idx on public.professional_services(service_id, professional_profile_id);

create table public.professional_specialties (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, specialty_id)
);
create index professional_specialties_specialty_idx
  on public.professional_specialties(specialty_id, professional_profile_id);

create table public.professional_audiences (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  audience_id uuid not null references public.audiences(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, audience_id)
);
create index professional_audiences_audience_idx
  on public.professional_audiences(audience_id, professional_profile_id);

create table public.professional_modalities (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  modality_id uuid not null references public.modalities(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, modality_id)
);
create index professional_modalities_modality_idx
  on public.professional_modalities(modality_id, professional_profile_id);

create table public.professional_locations (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, location_id)
);
create unique index professional_locations_one_primary_idx
  on public.professional_locations(professional_profile_id) where is_primary;
create index professional_locations_location_idx
  on public.professional_locations(location_id, professional_profile_id);

create table public.professional_languages (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete restrict,
  proficiency text not null default 'PROFESSIONAL'
    check (proficiency in ('NATIVE', 'FLUENT', 'PROFESSIONAL', 'CONVERSATIONAL')),
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, language_id)
);
create index professional_languages_language_idx
  on public.professional_languages(language_id, professional_profile_id);

create table public.professional_industries (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  industry_id uuid not null references public.industries(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, industry_id)
);
create index professional_industries_industry_idx
  on public.professional_industries(industry_id, professional_profile_id);

create table public.professional_career_stages (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  career_stage_id uuid not null references public.career_stages(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_profile_id, career_stage_id)
);
create index professional_career_stages_stage_idx
  on public.professional_career_stages(career_stage_id, professional_profile_id);

create table public.professional_availability (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  modality_id uuid references public.modalities(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time),
  unique nulls not distinct (professional_profile_id, weekday, start_time, end_time, modality_id, location_id)
);
create index professional_availability_profile_day_idx
  on public.professional_availability(professional_profile_id, weekday, start_time) where is_active;
create index professional_availability_modality_idx
  on public.professional_availability(modality_id) where modality_id is not null;
create index professional_availability_location_idx
  on public.professional_availability(location_id) where location_id is not null;

create table private.professional_contacts (
  professional_profile_id uuid primary key references public.professional_profiles(id) on delete cascade,
  contact_email text,
  contact_phone text,
  billing_legal_name text,
  tax_identifier text,
  billing_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_email is not null or contact_phone is not null)
);

-- ---------------------------------------------------------------------------
-- Private credential review workflow
-- ---------------------------------------------------------------------------

create table private.credentials (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  credential_type_id uuid not null references public.credential_types(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 180),
  issuing_entity text,
  jurisdiction text,
  registration_number text,
  storage_bucket text not null default 'professional-credentials'
    check (storage_bucket = 'professional-credentials'),
  object_path text not null unique,
  issued_on date,
  expires_on date,
  submitted_at timestamptz not null default now(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on > issued_on)
);
create index credentials_profile_idx on private.credentials(professional_profile_id, submitted_at desc);
create index credentials_type_idx on private.credentials(credential_type_id, professional_profile_id);

create table private.verifications (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references private.credentials(id) on delete cascade,
  reviewer_user_id uuid references public.user_profiles(id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  internal_notes text,
  reviewed_at timestamptz,
  valid_until date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'PENDING' and reviewed_at is null) or (status <> 'PENDING' and reviewed_at is not null))
);
create index verifications_credential_idx on private.verifications(credential_id, created_at desc);
create index verifications_reviewer_idx on private.verifications(reviewer_user_id, reviewed_at desc)
  where reviewer_user_id is not null;
create unique index verifications_one_current_idx
  on private.verifications(credential_id) where status in ('PENDING', 'APPROVED');

create or replace function private.calculate_professional_verification_state(p_profile_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_demo boolean;
  v_existing_state text;
begin
  select p.is_demo, p.verification_state into v_is_demo, v_existing_state
  from public.professional_profiles p where p.id = p_profile_id;

  if not found then
    return null;
  end if;
  if v_is_demo then
    return v_existing_state;
  end if;

  if exists (
    select 1
    from private.credentials c
    join private.verifications v on v.credential_id = c.id
    where c.professional_profile_id = p_profile_id
      and v.status = 'APPROVED'
      and (v.valid_until is null or v.valid_until >= current_date)
      and (c.expires_on is null or c.expires_on >= current_date)
      and not exists (
        select 1
        from public.professional_profile_types ppt
        join public.verification_rules vr
          on vr.professional_type_id = ppt.professional_type_id
         and vr.credential_type_id = c.credential_type_id
         and vr.is_active
         and vr.expires_after_months is not null
        where ppt.professional_profile_id = p_profile_id
          and (
            v.valid_until is null
            or v.reviewed_at is null
            or least(
              v.valid_until,
              (v.reviewed_at::date + make_interval(months => vr.expires_after_months::integer))::date
            ) < current_date
          )
      )
  ) and not exists (
    select 1
    from public.professional_profile_types ppt
    join public.verification_rules vr
      on vr.professional_type_id = ppt.professional_type_id
     and vr.requirement_level in ('REQUIRED', 'JURISDICTIONAL')
     and vr.is_active
    where ppt.professional_profile_id = p_profile_id
      and not exists (
        select 1
        from private.credentials c
        join private.verifications v on v.credential_id = c.id
        where c.professional_profile_id = p_profile_id
          and c.credential_type_id = vr.credential_type_id
          and v.status = 'APPROVED'
          and (v.valid_until is null or v.valid_until >= current_date)
          and (c.expires_on is null or c.expires_on >= current_date)
          and (
            vr.expires_after_months is null
            or (
              v.valid_until is not null
              and v.reviewed_at is not null
              and least(
                v.valid_until,
                (v.reviewed_at::date + make_interval(months => vr.expires_after_months::integer))::date
              ) >= current_date
            )
          )
          and (
            not vr.jurisdiction_required
            or (
              nullif(trim(c.jurisdiction), '') is not null
              and nullif(trim(c.registration_number), '') is not null
            )
          )
      )
  ) then
    return 'VERIFIED';
  elsif exists (
    select 1 from private.credentials c
    join private.verifications v on v.credential_id = c.id
    where c.professional_profile_id = p_profile_id and v.status = 'PENDING'
  ) then
    return 'PENDING';
  elsif exists (
    select 1 from private.credentials c
    join private.verifications v on v.credential_id = c.id
    where c.professional_profile_id = p_profile_id
      and (
        v.status = 'EXPIRED' or v.valid_until < current_date
        or c.expires_on < current_date
        or exists (
          select 1
          from public.professional_profile_types ppt
          join public.verification_rules vr
            on vr.professional_type_id = ppt.professional_type_id
           and vr.credential_type_id = c.credential_type_id
           and vr.is_active
           and vr.expires_after_months is not null
          where ppt.professional_profile_id = p_profile_id
            and (
              v.valid_until is null
              or v.reviewed_at is null
              or least(
                v.valid_until,
                (v.reviewed_at::date + make_interval(months => vr.expires_after_months::integer))::date
              ) < current_date
            )
        )
      )
  ) then
    return 'EXPIRED';
  elsif exists (
    select 1 from private.credentials c
    join private.verifications v on v.credential_id = c.id
    where c.professional_profile_id = p_profile_id and v.status = 'REJECTED'
  ) then
    return 'REJECTED';
  end if;

  return 'NOT_VERIFIED';
end;
$$;

create or replace function private.set_professional_verification_state(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.professional_profiles
  set verification_state = private.calculate_professional_verification_state(p_profile_id),
      updated_at = statement_timestamp()
  where id = p_profile_id and not is_demo;
end;
$$;

create or replace function private.is_professional_publicly_visible(p_profile_id uuid)
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

create or replace function private.can_view_professional_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_professional_publicly_visible(p_profile_id)
    or (
      (select auth.uid()) is not null
      and exists (
        select 1 from public.professional_profiles p
        where p.id = p_profile_id and p.user_id = (select auth.uid())
      )
    )
    or private.has_any_role(array['ADMIN', 'SUPERADMIN', 'EDITOR']);
$$;

revoke all on function private.can_view_professional_profile(uuid)
  from public, anon, authenticated;
grant execute on function private.can_view_professional_profile(uuid)
  to anon, authenticated, service_role;

create or replace function private.visible_professional_verification_state(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_professional_publicly_visible(p.id)
      or (select auth.uid()) = p.user_id
      or private.has_any_role(array['ADMIN', 'SUPERADMIN', 'EDITOR'])
    then private.calculate_professional_verification_state(p.id)
    else 'NOT_VERIFIED'
  end
  from public.professional_profiles p
  where p.id = p_profile_id;
$$;

create or replace function private.refresh_professional_verification_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  select c.professional_profile_id into v_profile_id
  from private.credentials c
  where c.id = coalesce(new.credential_id, old.credential_id);

  if v_profile_id is null then
    return coalesce(new, old);
  end if;

  perform private.set_professional_verification_state(v_profile_id);

  return coalesce(new, old);
end;
$$;

revoke all on function private.calculate_professional_verification_state(uuid) from public, anon, authenticated;
revoke all on function private.set_professional_verification_state(uuid) from public, anon, authenticated;
revoke all on function private.visible_professional_verification_state(uuid) from public, anon, authenticated;
revoke all on function private.refresh_professional_verification_state() from public, anon, authenticated;
grant execute on function private.visible_professional_verification_state(uuid) to anon, authenticated, service_role;

create trigger verifications_refresh_profile_state
after insert or update or delete on private.verifications
for each row execute function private.refresh_professional_verification_state();

create or replace function private.refresh_profile_from_credential()
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
  perform private.set_professional_verification_state(v_profile_id);
  return coalesce(new, old);
end;
$$;

revoke all on function private.refresh_profile_from_credential() from public, anon, authenticated;

create trigger credentials_refresh_profile_state
after insert or update or delete on private.credentials
for each row execute function private.refresh_profile_from_credential();

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
    update public.professional_profiles
    set publication_status = 'PENDING_REVIEW', published_at = null,
        updated_at = statement_timestamp()
    where id = v_profile_id and publication_status in ('PUBLISHED', 'PENDING_REVIEW');
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.mark_profile_taxonomy_changed() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'professional_profile_types', 'professional_needs', 'professional_services',
    'professional_specialties', 'professional_audiences', 'professional_modalities',
    'professional_locations', 'professional_languages', 'professional_industries',
    'professional_career_stages', 'professional_availability'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.mark_profile_taxonomy_changed()',
      v_table || '_mark_profile_changed', v_table
    );
  end loop;
end;
$$;

create or replace function private.refresh_profiles_for_verification_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_id uuid;
  v_old_type_id uuid;
  v_profile_id uuid;
begin
  v_type_id := case
    when tg_op = 'DELETE' then old.professional_type_id
    else new.professional_type_id
  end;
  v_old_type_id := case when tg_op = 'UPDATE' then old.professional_type_id else null end;

  for v_profile_id in
    select distinct ppt.professional_profile_id
    from public.professional_profile_types ppt
    where ppt.professional_type_id in (v_type_id, v_old_type_id)
  loop
    perform private.set_professional_verification_state(v_profile_id);
  end loop;
  return coalesce(new, old);
end;
$$;

revoke all on function private.refresh_profiles_for_verification_rule() from public, anon, authenticated;

create trigger verification_rules_refresh_profiles
after insert or update or delete on public.verification_rules
for each row execute function private.refresh_profiles_for_verification_rule();

create or replace function private.can_delete_unsubmitted_credential_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and p_object_path like (select auth.uid())::text || '/%'
    and not exists (
      select 1 from private.credentials c
      where c.storage_bucket = 'professional-credentials'
        and c.object_path = p_object_path
    );
$$;

revoke all on function private.can_delete_unsubmitted_credential_object(text) from public, anon, authenticated;
grant execute on function private.can_delete_unsubmitted_credential_object(text) to authenticated, service_role;

-- Private bucket: objects are namespaced as <auth.uid()>/<random filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-credentials',
  'professional-credentials',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy professional_credentials_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-credentials'
  and private.has_current_legal_acceptance()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy professional_credentials_select_own_or_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'professional-credentials'
  and private.has_current_legal_acceptance()
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
  )
);

create policy professional_credentials_delete_unsubmitted_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-credentials'
  and private.has_current_legal_acceptance()
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.can_delete_unsubmitted_credential_object(name)
);

-- ---------------------------------------------------------------------------
-- Leads, reputation and saved professionals
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete restrict,
  consumer_user_id uuid references public.user_profiles(id) on delete set null,
  need_id uuid references public.needs(id) on delete set null,
  status text not null default 'NEW'
    check (status in ('NEW', 'VIEWED', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM')),
  source text not null check (char_length(source) between 1 and 80),
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_path text check (
    landing_path is null
    or (char_length(landing_path) <= 500 and landing_path ~ '^/' and landing_path !~ '[?#]')
  ),
  plan_code_snapshot text,
  consent_version text not null,
  consented_at timestamptz not null,
  idempotency_key_hash text not null unique check (char_length(idempotency_key_hash) >= 32),
  is_demo boolean not null default false,
  viewed_at timestamptz,
  contacted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_professional_status_created_idx
  on public.leads(professional_profile_id, status, created_at desc);
create index leads_consumer_created_idx
  on public.leads(consumer_user_id, created_at desc) where consumer_user_id is not null;
create index leads_need_idx on public.leads(need_id) where need_id is not null;
create index leads_open_idx on public.leads(created_at, id)
  where status in ('NEW', 'VIEWED', 'CONTACTED', 'QUALIFIED');

create table private.lead_contacts (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (position('@' in email) > 1),
  phone text,
  message text not null check (char_length(message) between 10 and 4000),
  contact_preference text not null check (contact_preference in ('EMAIL', 'PHONE', 'WHATSAPP', 'ANY')),
  fingerprint_hash text check (fingerprint_hash is null or char_length(fingerprint_hash) >= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_contacts_fingerprint_idx on private.lead_contacts(fingerprint_hash)
  where fingerprint_hash is not null;

create table private.lead_status_history (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.user_profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index lead_status_history_lead_idx on private.lead_status_history(lead_id, created_at desc);
create index lead_status_history_actor_idx on private.lead_status_history(changed_by, created_at desc)
  where changed_by is not null;

create or replace function private.track_lead_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into private.lead_status_history (lead_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status else null end, new.status, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function private.track_lead_status() from public, anon, authenticated;

create trigger leads_track_status
after insert or update of status on public.leads
for each row execute function private.track_lead_status();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete restrict,
  reviewer_user_id uuid references public.user_profiles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  reviewer_display_name text not null check (char_length(reviewer_display_name) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 20 and 2000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  moderated_by uuid references public.user_profiles(id) on delete set null,
  moderated_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_demo and reviewer_user_id is null)
    or (not is_demo and reviewer_user_id is not null)
  ),
  check ((status = 'PENDING' and moderated_at is null) or (status <> 'PENDING' and moderated_at is not null))
);
create unique index reviews_one_per_lead_idx on public.reviews(lead_id) where lead_id is not null;
create index reviews_profile_approved_idx
  on public.reviews(professional_profile_id, created_at desc) where status = 'APPROVED';
create index reviews_reviewer_idx on public.reviews(reviewer_user_id, created_at desc)
  where reviewer_user_id is not null;
create index reviews_moderator_idx on public.reviews(moderated_by, moderated_at desc)
  where moderated_by is not null;

create or replace function private.prepare_review_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    new.reviewer_user_id := (select auth.uid());
    new.status := 'PENDING';
    new.moderated_by := null;
    new.moderated_at := null;
    new.is_demo := false;
    if new.lead_id is null or not exists (
      select 1 from public.leads l
      where l.id = new.lead_id
        and l.consumer_user_id = (select auth.uid())
        and l.professional_profile_id = new.professional_profile_id
        and l.status in ('CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED')
    ) then
      raise exception 'Review requires an eligible lead owned by the reviewer' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.prepare_review_insert() from public, anon, authenticated;

create trigger reviews_prepare_insert
before insert on public.reviews
for each row execute function private.prepare_review_insert();

create table public.favorites (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, professional_profile_id)
);
create index favorites_profile_idx on public.favorites(professional_profile_id, user_id);

-- ---------------------------------------------------------------------------
-- Subscriptions and transparent ranking signals
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'PENDING_PAYMENT'
    check (status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  lead_quota_snapshot integer check (lead_quota_snapshot is null or lead_quota_snapshot >= 0),
  leads_used_in_period integer not null default 0 check (leads_used_in_period >= 0),
  ranking_boost_snapshot numeric(4,2) not null default 0 check (ranking_boost_snapshot between 0 and 2),
  plan_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(plan_snapshot) = 'object'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start)
);
create unique index subscriptions_one_current_idx
  on public.subscriptions(professional_profile_id)
  where status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED');
create index subscriptions_plan_status_idx on public.subscriptions(plan_id, status);
create index subscriptions_period_end_idx on public.subscriptions(current_period_end)
  where status in ('TRIALING', 'ACTIVE', 'PAST_DUE');

create table private.payment_customers (
  professional_profile_id uuid primary key references public.professional_profiles(id) on delete cascade,
  provider text not null check (provider in ('MERCADO_PAGO')),
  external_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_customer_id)
);

create table private.subscription_events (
  id bigint generated always as identity primary key,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider in ('MERCADO_PAGO', 'MANUAL', 'LOCAL_TEST')),
  external_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  processed_at timestamptz,
  processing_error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct (provider, external_event_id)
);
create index subscription_events_subscription_idx
  on private.subscription_events(subscription_id, occurred_at desc) where subscription_id is not null;
create index subscription_events_unprocessed_idx
  on private.subscription_events(occurred_at, id) where processed_at is null;

create table public.professional_ranking_signals (
  professional_profile_id uuid primary key references public.professional_profiles(id) on delete cascade,
  availability_score numeric(5,2) not null default 50 check (availability_score between 0 and 100),
  completeness_score numeric(5,2) not null default 0 check (completeness_score between 0 and 100),
  response_score numeric(5,2) not null default 50 check (response_score between 0 and 100),
  activity_score numeric(5,2) not null default 50 check (activity_score between 0 and 100),
  quality_score numeric(5,2) not null default 50 check (quality_score between 0 and 100),
  plan_boost_points numeric(4,2) not null default 0 check (plan_boost_points between 0 and 2),
  is_sponsored boolean not null default false,
  ranking_version text not null default 'rank-v1',
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index professional_ranking_signals_sponsored_idx
  on public.professional_ranking_signals(is_sponsored, calculated_at desc)
  where is_sponsored;

create table public.professional_metrics_daily (
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  metric_date date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  profile_views bigint not null default 0 check (profile_views >= 0),
  contact_starts bigint not null default 0 check (contact_starts >= 0),
  leads bigint not null default 0 check (leads >= 0),
  lead_responses bigint not null default 0 check (lead_responses >= 0),
  response_time_seconds_sum bigint not null default 0 check (response_time_seconds_sum >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (professional_profile_id, metric_date)
);
create index professional_metrics_daily_date_idx
  on public.professional_metrics_daily(metric_date desc, professional_profile_id);

-- ---------------------------------------------------------------------------
-- Content and institutional agreements
-- ---------------------------------------------------------------------------

create table public.article_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid references public.professional_profiles(id) on delete set null,
  category_id uuid references public.article_categories(id) on delete set null,
  title text not null check (char_length(title) between 5 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null check (char_length(excerpt) between 20 and 400),
  body text not null check (char_length(body) between 100 and 50000),
  tags text[] not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED')),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  canonical_url text,
  published_at timestamptz,
  moderated_by uuid references public.user_profiles(id) on delete set null,
  moderated_at timestamptz,
  is_demo boolean not null default false,
  search_vector tsvector generated always as (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'PUBLISHED' and published_at is not null) or status <> 'PUBLISHED'),
  check ((status in ('DRAFT', 'PENDING') and moderated_at is null) or status in ('PUBLISHED', 'REJECTED'))
);
create index articles_author_status_idx on public.articles(author_profile_id, status, updated_at desc)
  where author_profile_id is not null;
create index articles_category_published_idx on public.articles(category_id, published_at desc)
  where status = 'PUBLISHED';
create index articles_search_idx on public.articles using gin(search_vector);
create index articles_tags_idx on public.articles using gin(tags);

create or replace function private.guard_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not private.has_any_role(array['EDITOR', 'ADMIN', 'SUPERADMIN']) then
    if tg_op = 'INSERT' then
      new.status := 'DRAFT';
      new.published_at := null;
      new.moderated_by := null;
      new.moderated_at := null;
      new.is_demo := false;
    else
      new.author_profile_id := old.author_profile_id;
      new.is_demo := old.is_demo;
      if old.status = 'PUBLISHED' then
        new.status := 'PENDING';
        new.published_at := null;
        new.moderated_by := null;
        new.moderated_at := null;
      elsif old.status = 'REJECTED' then
        new.status := 'DRAFT';
        new.published_at := null;
        new.moderated_by := null;
        new.moderated_at := null;
      else
        new.status := old.status;
        new.published_at := old.published_at;
        new.moderated_by := old.moderated_by;
        new.moderated_at := old.moderated_at;
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_article_write() from public, anon, authenticated;

create trigger articles_guard_write
before insert or update on public.articles
for each row execute function private.guard_article_write();

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 180),
  institution_type text not null
    check (institution_type in ('COMPANY', 'UNIVERSITY', 'ASSOCIATION', 'COMMUNITY', 'MUTUAL', 'OTHER')),
  summary text,
  logo_path text,
  website_url text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 180),
  summary text not null check (char_length(summary) between 20 and 1000),
  terms_public text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'PAUSED', 'EXPIRED')),
  modality_notes text,
  discount_percent numeric(5,2) check (discount_percent between 0 and 100),
  special_fee numeric(12,2) check (special_fee is null or special_fee >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  quota_total integer check (quota_total is null or quota_total >= 0),
  valid_from date,
  valid_until date,
  is_public boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((special_fee is null and currency is null) or (special_fee is not null and currency is not null)),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index agreements_institution_status_idx on public.agreements(institution_id, status, valid_until);
create index agreements_public_idx on public.agreements(updated_at desc)
  where status = 'PUBLISHED' and is_public;

create table public.agreement_professionals (
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'PAUSED', 'REMOVED')),
  custom_discount_percent numeric(5,2) check (custom_discount_percent between 0 and 100),
  custom_fee numeric(12,2) check (custom_fee is null or custom_fee >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  quota integer check (quota is null or quota >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agreement_id, professional_profile_id),
  check ((custom_fee is null and currency is null) or (custom_fee is not null and currency is not null))
);
create index agreement_professionals_profile_idx
  on public.agreement_professionals(professional_profile_id, agreement_id);

create table public.agreement_services (
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (agreement_id, service_id)
);
create index agreement_services_service_idx on public.agreement_services(service_id, agreement_id);

-- ---------------------------------------------------------------------------
-- Matching: versioned, deterministic and explainable
-- ---------------------------------------------------------------------------

create table public.matching_questions (
  id uuid primary key default gen_random_uuid(),
  rule_version text not null,
  code text not null check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  prompt text not null check (char_length(prompt) between 5 and 300),
  help_text text,
  answer_type text not null check (answer_type in ('SINGLE', 'MULTIPLE', 'BOOLEAN')),
  position smallint not null check (position >= 0),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_version, code),
  unique (rule_version, position)
);

create table public.matching_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.matching_questions(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 1 and 180),
  description text,
  position smallint not null check (position >= 0),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, code),
  unique (question_id, position)
);
create index matching_options_question_active_idx
  on public.matching_options(question_id, position) where is_active;

create table public.matching_rules (
  id bigint generated always as identity primary key,
  rule_version text not null,
  option_id uuid not null references public.matching_options(id) on delete cascade,
  need_id uuid references public.needs(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  professional_type_id uuid references public.professional_types(id) on delete cascade,
  specialty_id uuid references public.specialties(id) on delete cascade,
  audience_id uuid references public.audiences(id) on delete cascade,
  modality_id uuid references public.modalities(id) on delete cascade,
  language_id uuid references public.languages(id) on delete cascade,
  industry_id uuid references public.industries(id) on delete cascade,
  career_stage_id uuid references public.career_stages(id) on delete cascade,
  weight numeric(7,3) not null check (weight between -100 and 100),
  reason text not null check (char_length(reason) between 5 and 240),
  is_hard_constraint boolean not null default false,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (num_nonnulls(need_id, service_id, professional_type_id, specialty_id, audience_id, modality_id, language_id, industry_id, career_stage_id) = 1),
  unique nulls not distinct (
    rule_version, option_id, need_id, service_id, professional_type_id,
    specialty_id, audience_id, modality_id, language_id, industry_id, career_stage_id
  )
);
create index matching_rules_option_idx on public.matching_rules(option_id, rule_version) where is_active;
create index matching_rules_need_idx on public.matching_rules(need_id) where need_id is not null;
create index matching_rules_service_idx on public.matching_rules(service_id) where service_id is not null;
create index matching_rules_type_idx on public.matching_rules(professional_type_id) where professional_type_id is not null;
create index matching_rules_specialty_idx on public.matching_rules(specialty_id) where specialty_id is not null;
create index matching_rules_career_stage_idx on public.matching_rules(career_stage_id) where career_stage_id is not null;

create table public.matching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null,
  rule_version text not null,
  status text not null default 'STARTED' check (status in ('STARTED', 'COMPLETED', 'ABANDONED', 'EXPIRED')),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'COMPLETED' and completed_at is not null) or status <> 'COMPLETED')
);
create index matching_sessions_user_idx on public.matching_sessions(user_id, created_at desc)
  where user_id is not null;
create index matching_sessions_expiry_idx on public.matching_sessions(expires_at)
  where status in ('STARTED', 'COMPLETED');

create table private.matching_session_tokens (
  matching_session_id uuid primary key references public.matching_sessions(id) on delete cascade,
  anonymous_token_hash text not null unique check (char_length(anonymous_token_hash) >= 32),
  created_at timestamptz not null default now()
);

create table public.matching_answers (
  id bigint generated always as identity primary key,
  matching_session_id uuid not null references public.matching_sessions(id) on delete cascade,
  question_id uuid not null references public.matching_questions(id) on delete restrict,
  option_id uuid references public.matching_options(id) on delete restrict,
  answer_value jsonb,
  created_at timestamptz not null default now(),
  check (option_id is not null or answer_value is not null),
  check (answer_value is null or octet_length(answer_value::text) <= 2048),
  unique nulls not distinct (matching_session_id, question_id, option_id)
);
create index matching_answers_session_idx on public.matching_answers(matching_session_id, question_id);
create index matching_answers_option_idx on public.matching_answers(option_id) where option_id is not null;

create table public.matching_recommendations (
  id bigint generated always as identity primary key,
  matching_session_id uuid not null references public.matching_sessions(id) on delete cascade,
  professional_profile_id uuid references public.professional_profiles(id) on delete cascade,
  professional_type_id uuid references public.professional_types(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  rank smallint not null check (rank > 0),
  score numeric(6,3) not null check (score between 0 and 100),
  explanation jsonb not null check (jsonb_typeof(explanation) = 'object'),
  rule_version text not null,
  ranking_version text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(professional_profile_id, professional_type_id, service_id) >= 1),
  unique (matching_session_id, rank)
);
create index matching_recommendations_session_score_idx
  on public.matching_recommendations(matching_session_id, score desc, rank);
create index matching_recommendations_profile_idx
  on public.matching_recommendations(professional_profile_id) where professional_profile_id is not null;

-- ---------------------------------------------------------------------------
-- Notifications/outbox, analytics, throttling and audit
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  notification_type text not null check (notification_type ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 1000),
  href text,
  read_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc)
  where read_at is null;

create table private.notification_outbox (
  id bigint generated always as identity primary key,
  notification_id uuid references public.notifications(id) on delete set null,
  lead_id uuid references public.leads(id) on delete cascade,
  recipient_user_id uuid references public.user_profiles(id) on delete cascade,
  recipient_kind text not null check (recipient_kind in ('USER', 'LEAD_CONSUMER')),
  channel text not null check (channel in ('EMAIL', 'IN_APP', 'WHATSAPP', 'SMS', 'PUSH')),
  template_key text not null check (template_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null unique,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELED')),
  attempts smallint not null default 0 check (attempts between 0 and 30),
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  lock_token uuid,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (recipient_kind = 'USER' and recipient_user_id is not null)
    or (recipient_kind = 'LEAD_CONSUMER' and lead_id is not null)
  ),
  check (
    (
      status = 'PROCESSING'
      and locked_at is not null and locked_by is not null and lock_token is not null
    )
    or (
      status <> 'PROCESSING'
      and locked_at is null and locked_by is null and lock_token is null
    )
  )
);
create index notification_outbox_claim_idx
  on private.notification_outbox(scheduled_at, id)
  where status in ('QUEUED', 'FAILED') and attempts < 30;
create index notification_outbox_reclaim_idx
  on private.notification_outbox(locked_at, id)
  where status = 'PROCESSING' and attempts < 30;
create index notification_outbox_user_idx
  on private.notification_outbox(recipient_user_id, created_at desc) where recipient_user_id is not null;
create index notification_outbox_lead_idx
  on private.notification_outbox(lead_id, created_at desc) where lead_id is not null;

create table private.rate_limit_buckets (
  scope text not null check (scope ~ '^[a-z0-9]+(?:[._:-][a-z0-9]+)*$'),
  key_hash text not null check (char_length(key_hash) >= 32),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at),
  check (expires_at > window_started_at)
);
create index rate_limit_buckets_expiry_idx on private.rate_limit_buckets(expires_at);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check (
    event_name in (
      'search_started', 'filter_applied', 'professional_card_viewed',
      'professional_profile_viewed', 'contact_started', 'lead_created',
      'matching_started', 'matching_completed', 'signup_started',
      'professional_signup_completed', 'subscription_started',
      'article_viewed', 'agreement_viewed'
    )
  ),
  anonymous_id_hash text check (anonymous_id_hash is null or char_length(anonymous_id_hash) >= 32),
  user_id uuid references public.user_profiles(id) on delete set null,
  session_id text check (session_id is null or session_id ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),
  path text check (
    path is null
    or (char_length(path) <= 500 and path ~ '^/' and path !~ '[?#]')
  ),
  professional_profile_id uuid references public.professional_profiles(id) on delete set null,
  article_id uuid references public.articles(id) on delete set null,
  agreement_id uuid references public.agreements(id) on delete set null,
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object' and octet_length(properties::text) <= 4096),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (anonymous_id_hash is not null or user_id is not null)
);
create index analytics_events_name_time_idx on public.analytics_events(event_name, occurred_at desc);
create index analytics_events_profile_time_idx
  on public.analytics_events(professional_profile_id, occurred_at desc)
  where professional_profile_id is not null;
create index analytics_events_article_time_idx
  on public.analytics_events(article_id, occurred_at desc) where article_id is not null;
create index analytics_events_agreement_time_idx
  on public.analytics_events(agreement_id, occurred_at desc) where agreement_id is not null;
create index analytics_events_user_time_idx
  on public.analytics_events(user_id, occurred_at desc) where user_id is not null;
create index analytics_events_properties_idx on public.analytics_events using gin(properties jsonb_path_ops);

create table private.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  actor_db_role text not null,
  action text not null,
  entity_schema text not null,
  entity_table text not null,
  entity_id text,
  changed_fields text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);
create index audit_log_entity_idx
  on private.audit_log(entity_schema, entity_table, entity_id, occurred_at desc);
create index audit_log_actor_idx on private.audit_log(actor_user_id, occurred_at desc)
  where actor_user_id is not null;
create index audit_log_time_brin_idx on private.audit_log using brin(occurred_at);

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  v_fields text[];
  v_entity_id text;
begin
  select coalesce(array_agg(k order by k), '{}') into v_fields
  from (
    select key as k from jsonb_each(v_old)
    union
    select key as k from jsonb_each(v_new)
  ) keys
  where v_old -> k is distinct from v_new -> k;

  v_entity_id := coalesce(
    v_new ->> 'id', v_old ->> 'id',
    v_new ->> 'professional_profile_id', v_old ->> 'professional_profile_id',
    v_new ->> 'user_id', v_old ->> 'user_id'
  );

  insert into private.audit_log (
    actor_user_id, actor_db_role, action, entity_schema, entity_table,
    entity_id, changed_fields
  ) values (
    (select auth.uid()),
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), session_user),
    tg_op, tg_table_schema, tg_table_name,
    v_entity_id, v_fields
  );

  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_row_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Narrow RPC surface
-- ---------------------------------------------------------------------------

create or replace function private.accept_current_terms(p_terms_version text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_accepted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if (
    select count(*)
    from private.legal_document_versions d
    where d.document_type in ('TERMS', 'PRIVACY')
      and d.version = p_terms_version
      and d.is_current
      and d.published_at <= statement_timestamp()
  ) <> 2 then
    raise exception 'Legal document bundle is not current' using errcode = '22023';
  end if;

  v_accepted_at := statement_timestamp();
  insert into private.legal_acceptances (
    user_id, document_type, document_version, accepted_at
  )
  select v_user_id, d.document_type, d.version, v_accepted_at
  from private.legal_document_versions d
  where d.document_type in ('TERMS', 'PRIVACY')
    and d.version = p_terms_version
    and d.is_current
  on conflict (user_id, document_type, document_version) do nothing;

  select min(a.accepted_at) into v_accepted_at
  from private.legal_acceptances a
  where a.user_id = v_user_id
    and a.document_type in ('TERMS', 'PRIVACY')
    and a.document_version = p_terms_version;

  update public.user_profiles
  set terms_version = p_terms_version,
      terms_accepted_at = v_accepted_at,
      updated_at = statement_timestamp()
  where id = v_user_id;

  if not found then
    raise exception 'User profile not found' using errcode = '22023';
  end if;
  return v_accepted_at;
end;
$$;

revoke all on function private.accept_current_terms(text) from public, anon, authenticated;
grant execute on function private.accept_current_terms(text) to authenticated, service_role;

create or replace function public.accept_current_terms(p_terms_version text)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.accept_current_terms(p_terms_version); $$;

revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated, service_role;

create or replace function private.accept_terms_from_signup_backend(
  p_user_id uuid,
  p_terms_version text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accepted_at timestamptz := statement_timestamp();
begin
  if not exists (
    select 1
    from auth.users u
    join public.user_profiles up on up.id = u.id
    where u.id = p_user_id and not up.is_demo
  ) then
    raise exception 'Auth user and user profile are required' using errcode = '22023';
  end if;
  if (
    select count(*)
    from private.legal_document_versions d
    where d.document_type in ('TERMS', 'PRIVACY')
      and d.version = p_terms_version
      and d.is_current
      and d.published_at <= statement_timestamp()
  ) <> 2 then
    raise exception 'Legal document bundle is not current' using errcode = '22023';
  end if;

  insert into private.legal_acceptances (
    user_id, document_type, document_version, accepted_at, source
  )
  select p_user_id, d.document_type, d.version, v_accepted_at, 'SIGNUP_BACKEND'
  from private.legal_document_versions d
  where d.document_type in ('TERMS', 'PRIVACY')
    and d.version = p_terms_version
    and d.is_current
  on conflict (user_id, document_type, document_version) do nothing;

  select min(a.accepted_at) into v_accepted_at
  from private.legal_acceptances a
  where a.user_id = p_user_id
    and a.document_type in ('TERMS', 'PRIVACY')
    and a.document_version = p_terms_version;

  update public.user_profiles
  set terms_version = p_terms_version,
      terms_accepted_at = v_accepted_at,
      updated_at = statement_timestamp()
  where id = p_user_id;

  return v_accepted_at;
end;
$$;

revoke all on function private.accept_terms_from_signup_backend(uuid, text)
  from public, anon, authenticated;
grant execute on function private.accept_terms_from_signup_backend(uuid, text)
  to service_role;

create or replace function public.accept_terms_from_signup_backend(
  p_user_id uuid,
  p_terms_version text
)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.accept_terms_from_signup_backend(p_user_id, p_terms_version); $$;

revoke all on function public.accept_terms_from_signup_backend(uuid, text)
  from public, anon, authenticated;
grant execute on function public.accept_terms_from_signup_backend(uuid, text)
  to service_role;

create or replace function private.bootstrap_first_superadmin_from_backend(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id bigint;
begin
  -- Serialize bootstrap attempts without locking the entire role assignment table.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('red_senda:first_superadmin', 0)
  );

  select r.id into v_role_id
  from public.roles r
  where r.code = 'SUPERADMIN'
  for update;

  if v_role_id is null then
    raise exception 'SUPERADMIN role is not configured' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.user_roles ur where ur.role_id = v_role_id
  ) then
    raise exception 'A SUPERADMIN already exists' using errcode = '23505';
  end if;
  if not exists (
    select 1
    from auth.users u
    join public.user_profiles up on up.id = u.id
    where u.id = p_user_id and not up.is_demo
  ) then
    raise exception 'Auth user and user profile are required' using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (p_user_id, v_role_id, null);

  insert into private.audit_log (
    actor_user_id, actor_db_role, action, entity_schema, entity_table,
    entity_id, changed_fields, metadata
  ) values (
    null,
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), session_user),
    'FIRST_SUPERADMIN_BOOTSTRAPPED', 'public', 'user_roles',
    p_user_id::text, array['role_id'], jsonb_build_object('role_code', 'SUPERADMIN')
  );
end;
$$;

revoke all on function private.bootstrap_first_superadmin_from_backend(uuid)
  from public, anon, authenticated;
grant execute on function private.bootstrap_first_superadmin_from_backend(uuid)
  to service_role;

create or replace function public.bootstrap_first_superadmin_from_backend(p_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.bootstrap_first_superadmin_from_backend(p_user_id); $$;

revoke all on function public.bootstrap_first_superadmin_from_backend(uuid)
  from public, anon, authenticated;
grant execute on function public.bootstrap_first_superadmin_from_backend(uuid)
  to service_role;

create or replace function public.consume_rate_limit_from_backend(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_scope is null or p_scope !~ '^[a-z0-9]+(?:[._:-][a-z0-9]+)*$' then
    raise exception 'Invalid rate-limit scope' using errcode = '22023';
  end if;
  if p_key_hash is null or char_length(p_key_hash) < 32 then
    raise exception 'Rate-limit key must be a server-side hash' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit configuration' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limit_buckets (
    scope, key_hash, window_started_at, request_count, expires_at
  ) values (
    p_scope, p_key_hash, v_window_start, 1,
    v_window_start + make_interval(secs => p_window_seconds)
  )
  on conflict (scope, key_hash, window_started_at)
  do update set
    request_count = private.rate_limit_buckets.request_count + 1,
    updated_at = statement_timestamp()
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit_from_backend(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit_from_backend(text, text, integer, integer)
  to service_role;

create or replace function public.create_lead_from_backend(
  p_professional_profile_id uuid,
  p_full_name text,
  p_email text,
  p_message text,
  p_contact_preference text,
  p_source text,
  p_consent_version text,
  p_consented_at timestamptz,
  p_idempotency_key_hash text,
  p_consumer_user_id uuid default null,
  p_need_id uuid default null,
  p_phone text default null,
  p_campaign text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_landing_path text default null,
  p_plan_code_snapshot text default null,
  p_fingerprint_hash text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead_id uuid;
  v_professional_user_id uuid;
  v_notification_id uuid;
  v_plan_code text;
begin
  select p.user_id into v_professional_user_id
  from public.professional_profiles p
  where p.id = p_professional_profile_id
    and private.is_professional_publicly_visible(p.id)
    and p.is_accepting_leads;

  if not found then
    raise exception 'Professional is not available for leads' using errcode = '22023';
  end if;

  if char_length(trim(p_full_name)) not between 2 and 120
     or position('@' in p_email) <= 1
     or char_length(trim(p_message)) not between 10 and 4000
     or p_contact_preference not in ('EMAIL', 'PHONE', 'WHATSAPP', 'ANY')
     or char_length(p_idempotency_key_hash) < 32
     or p_consented_at > statement_timestamp() + interval '5 minutes'
     or p_consented_at < statement_timestamp() - interval '24 hours' then
    raise exception 'Invalid lead payload' using errcode = '22023';
  end if;

  select coalesce(
    p_plan_code_snapshot,
    (
      select pl.code
      from public.subscriptions s
      join public.plans pl on pl.id = s.plan_id
      where s.professional_profile_id = p_professional_profile_id
        and s.status in ('TRIALING', 'ACTIVE')
      order by s.created_at desc
      limit 1
    )
  ) into v_plan_code;

  insert into public.leads (
    professional_profile_id, consumer_user_id, need_id, source, campaign,
    utm_source, utm_medium, utm_campaign, landing_path, plan_code_snapshot,
    consent_version, consented_at, idempotency_key_hash
  ) values (
    p_professional_profile_id, p_consumer_user_id, p_need_id, trim(p_source), nullif(trim(p_campaign), ''),
    nullif(trim(p_utm_source), ''), nullif(trim(p_utm_medium), ''), nullif(trim(p_utm_campaign), ''),
    nullif(trim(p_landing_path), ''), v_plan_code, p_consent_version, p_consented_at,
    p_idempotency_key_hash
  )
  on conflict (idempotency_key_hash) do nothing
  returning id into v_lead_id;

  if v_lead_id is null then
    select id into v_lead_id
    from public.leads
    where idempotency_key_hash = p_idempotency_key_hash;
    return v_lead_id;
  end if;

  insert into private.lead_contacts (
    lead_id, full_name, email, phone, message, contact_preference, fingerprint_hash
  ) values (
    v_lead_id, trim(p_full_name), lower(trim(p_email)), nullif(trim(p_phone), ''),
    trim(p_message), p_contact_preference, p_fingerprint_hash
  );

  if v_professional_user_id is not null then
    insert into public.notifications (user_id, notification_type, title, body, href)
    values (
      v_professional_user_id, 'new_lead', 'Recibiste una nueva consulta',
      'Hay una nueva consulta disponible en tu panel.', '/dashboard/leads/' || v_lead_id::text
    ) returning id into v_notification_id;

    insert into private.notification_outbox (
      notification_id, lead_id, recipient_user_id, recipient_kind, channel,
      template_key, payload, idempotency_key
    ) values (
      v_notification_id, v_lead_id, v_professional_user_id, 'USER', 'EMAIL',
      'professional_new_lead', jsonb_build_object('lead_id', v_lead_id),
      'lead:' || v_lead_id::text || ':professional:email'
    );
  end if;

  insert into private.notification_outbox (
    lead_id, recipient_kind, channel, template_key, payload, idempotency_key
  ) values (
    v_lead_id, 'LEAD_CONSUMER', 'EMAIL', 'consumer_lead_confirmation',
    jsonb_build_object('lead_id', v_lead_id),
    'lead:' || v_lead_id::text || ':consumer:email'
  );

  insert into public.professional_metrics_daily (
    professional_profile_id, metric_date, leads
  ) values (
    p_professional_profile_id,
    (statement_timestamp() at time zone 'America/Argentina/Buenos_Aires')::date,
    1
  )
  on conflict (professional_profile_id, metric_date) do update
  set leads = public.professional_metrics_daily.leads + 1,
      updated_at = statement_timestamp();

  update public.subscriptions
  set leads_used_in_period = leads_used_in_period + 1,
      updated_at = statement_timestamp()
  where professional_profile_id = p_professional_profile_id
    and status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE')
    and (current_period_start is null or current_period_start <= statement_timestamp())
    and (current_period_end is null or current_period_end > statement_timestamp());

  return v_lead_id;
end;
$$;

revoke all on function public.create_lead_from_backend(
  uuid, text, text, text, text, text, text, timestamptz, text,
  uuid, uuid, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_lead_from_backend(
  uuid, text, text, text, text, text, text, timestamptz, text,
  uuid, uuid, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.record_analytics_event_from_backend(
  p_event_name text,
  p_anonymous_id_hash text default null,
  p_user_id uuid default null,
  p_session_id text default null,
  p_path text default null,
  p_professional_profile_id uuid default null,
  p_article_id uuid default null,
  p_agreement_id uuid default null,
  p_properties jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id bigint;
begin
  if p_occurred_at > statement_timestamp() + interval '5 minutes'
     or p_occurred_at < statement_timestamp() - interval '7 days' then
    raise exception 'Invalid analytics timestamp' using errcode = '22023';
  end if;
  if p_event_name in (
    'professional_card_viewed', 'professional_profile_viewed', 'contact_started'
  ) and p_professional_profile_id is null then
    raise exception 'Professional profile is required for this event' using errcode = '22023';
  end if;

  insert into public.analytics_events (
    event_name, anonymous_id_hash, user_id, session_id, occurred_at, path,
    professional_profile_id, article_id, agreement_id, properties
  ) values (
    p_event_name, p_anonymous_id_hash, p_user_id, p_session_id, p_occurred_at,
    p_path, p_professional_profile_id, p_article_id, p_agreement_id,
    coalesce(p_properties, '{}'::jsonb)
  ) returning id into v_event_id;

  -- These counters are derived from the accepted server event, never from a
  -- client-supplied aggregate. Authoritative lead counts are updated only by
  -- create_lead_from_backend to preserve lead idempotency.
  if p_professional_profile_id is not null
     and p_event_name in (
       'professional_card_viewed', 'professional_profile_viewed', 'contact_started'
     ) then
    insert into public.professional_metrics_daily (
      professional_profile_id, metric_date, impressions, profile_views, contact_starts
    ) values (
      p_professional_profile_id,
      (p_occurred_at at time zone 'America/Argentina/Buenos_Aires')::date,
      case when p_event_name = 'professional_card_viewed' then 1 else 0 end,
      case when p_event_name = 'professional_profile_viewed' then 1 else 0 end,
      case when p_event_name = 'contact_started' then 1 else 0 end
    )
    on conflict (professional_profile_id, metric_date) do update
    set impressions = public.professional_metrics_daily.impressions + excluded.impressions,
        profile_views = public.professional_metrics_daily.profile_views + excluded.profile_views,
        contact_starts = public.professional_metrics_daily.contact_starts + excluded.contact_starts,
        updated_at = statement_timestamp();
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.record_analytics_event_from_backend(
  text, text, uuid, text, text, uuid, uuid, uuid, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_analytics_event_from_backend(
  text, text, uuid, text, text, uuid, uuid, uuid, jsonb, timestamptz
) to service_role;

create or replace function private.claim_notification_outbox_from_backend(
  p_worker_id text,
  p_batch_size integer default 25
)
returns table (
  id bigint,
  notification_id uuid,
  lead_id uuid,
  recipient_user_id uuid,
  recipient_kind text,
  channel text,
  template_key text,
  payload jsonb,
  attempts smallint,
  lock_token uuid,
  recipient_email text,
  recipient_name text,
  professional_name text
)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select o.id
    from private.notification_outbox o
    where nullif(trim(p_worker_id), '') is not null
      and o.attempts < 30
      and (
        (
          o.status in ('QUEUED', 'FAILED')
          and o.scheduled_at <= statement_timestamp()
        )
        or (
          o.status = 'PROCESSING'
          and o.locked_at <= statement_timestamp() - interval '15 minutes'
        )
      )
    order by
      case when o.status = 'PROCESSING' then o.locked_at else o.scheduled_at end,
      o.id
    limit least(greatest(p_batch_size, 1), 100)
    for update skip locked
  ), claimed as (
    update private.notification_outbox o
    set status = 'PROCESSING',
        attempts = o.attempts + 1,
        locked_at = statement_timestamp(),
        locked_by = left(trim(p_worker_id), 120),
        lock_token = extensions.gen_random_uuid(),
        updated_at = statement_timestamp()
    from candidates c
    where o.id = c.id
    returning o.id, o.notification_id, o.lead_id, o.recipient_user_id,
              o.recipient_kind, o.channel, o.template_key, o.payload, o.attempts,
              o.lock_token
  )
  select
    c.id, c.notification_id, c.lead_id, c.recipient_user_id,
    c.recipient_kind, c.channel, c.template_key, c.payload, c.attempts, c.lock_token,
    case
      when c.recipient_kind = 'USER' then lower(au.email)
      else lc.email
    end as recipient_email,
    case
      when c.recipient_kind = 'USER' then coalesce(
        nullif(trim(up.display_name), ''),
        nullif(trim(concat_ws(' ', pp.first_name, pp.last_name)), '')
      )
      else lc.full_name
    end as recipient_name,
    nullif(trim(concat_ws(' ', pp.first_name, pp.last_name)), '') as professional_name
  from claimed c
  left join public.leads l on l.id = c.lead_id
  left join private.lead_contacts lc on lc.lead_id = c.lead_id
  left join public.professional_profiles pp on pp.id = l.professional_profile_id
  left join auth.users au on au.id = c.recipient_user_id
  left join public.user_profiles up on up.id = c.recipient_user_id;
$$;

revoke all on function private.claim_notification_outbox_from_backend(text, integer)
  from public, anon, authenticated;
grant execute on function private.claim_notification_outbox_from_backend(text, integer)
  to service_role;

create or replace function public.claim_notification_outbox_from_backend(
  p_worker_id text,
  p_batch_size integer default 25
)
returns table (
  id bigint,
  notification_id uuid,
  lead_id uuid,
  recipient_user_id uuid,
  recipient_kind text,
  channel text,
  template_key text,
  payload jsonb,
  attempts smallint,
  lock_token uuid,
  recipient_email text,
  recipient_name text,
  professional_name text
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.claim_notification_outbox_from_backend(p_worker_id, p_batch_size);
$$;

revoke all on function public.claim_notification_outbox_from_backend(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_outbox_from_backend(text, integer)
  to service_role;

create or replace function public.complete_notification_outbox_from_backend(
  p_outbox_id bigint,
  p_lock_token uuid,
  p_succeeded boolean,
  p_error text default null,
  p_retry_after interval default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.notification_outbox
  set status = case when p_succeeded then 'SENT' else 'FAILED' end,
      sent_at = case when p_succeeded then statement_timestamp() else null end,
      last_error = case when p_succeeded then null else left(coalesce(p_error, 'Unspecified delivery error'), 2000) end,
      scheduled_at = case
        when p_succeeded then scheduled_at
        else statement_timestamp() + coalesce(p_retry_after, interval '5 minutes')
      end,
      locked_at = null,
      locked_by = null,
      lock_token = null,
      updated_at = statement_timestamp()
  where id = p_outbox_id
    and status = 'PROCESSING'
    and lock_token = p_lock_token;

  if not found then
    raise exception 'Outbox lease is no longer valid' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.complete_notification_outbox_from_backend(bigint, uuid, boolean, text, interval)
  from public, anon, authenticated;
grant execute on function public.complete_notification_outbox_from_backend(bigint, uuid, boolean, text, interval)
  to service_role;

create or replace function private.submit_professional_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional_role_id bigint;
begin
  if (select auth.uid()) is null or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;

  perform private.set_professional_verification_state(p_profile_id);

  if not exists (select 1 from public.professional_profile_types where professional_profile_id = p_profile_id)
     or not exists (select 1 from public.professional_needs where professional_profile_id = p_profile_id)
     or not exists (select 1 from public.professional_services where professional_profile_id = p_profile_id and is_active)
     or not exists (select 1 from public.professional_modalities where professional_profile_id = p_profile_id)
     or not exists (select 1 from public.professional_languages where professional_profile_id = p_profile_id)
     or not exists (
       select 1 from public.subscriptions
       where professional_profile_id = p_profile_id
         and status in ('PENDING_PAYMENT', 'TRIALING', 'ACTIVE')
     ) then
    raise exception 'Profile onboarding is incomplete' using errcode = '23514';
  end if;

  update public.professional_profiles
  set publication_status = 'PENDING_REVIEW', published_at = null,
      updated_at = statement_timestamp()
  where id = p_profile_id and publication_status in ('DRAFT', 'REJECTED');

  if not found then
    raise exception 'Profile cannot be submitted from its current state' using errcode = '22023';
  end if;

  select id into v_professional_role_id from public.roles where code = 'PROFESSIONAL';
  insert into public.user_roles (user_id, role_id)
  values ((select auth.uid()), v_professional_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function private.submit_professional_profile(uuid) from public, anon, authenticated;
grant execute on function private.submit_professional_profile(uuid) to authenticated, service_role;

create or replace function public.submit_professional_profile(p_profile_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.submit_professional_profile(p_profile_id); $$;

revoke all on function public.submit_professional_profile(uuid) from public, anon;
grant execute on function public.submit_professional_profile(uuid) to authenticated, service_role;

create or replace function private.select_professional_plan(p_profile_id uuid, p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_subscription_id uuid;
begin
  if (select auth.uid()) is null or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;

  select * into v_plan from public.plans where code = upper(p_plan_code) and is_active;
  if not found then
    raise exception 'Unknown or inactive plan' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.subscriptions
    where professional_profile_id = p_profile_id and status in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED')
  ) then
    raise exception 'Active subscriptions require the billing change workflow' using errcode = '22023';
  end if;

  select id into v_subscription_id
  from public.subscriptions
  where professional_profile_id = p_profile_id and status = 'PENDING_PAYMENT'
  for update;

  if v_subscription_id is null then
    insert into public.subscriptions (
      professional_profile_id, plan_id, status, lead_quota_snapshot,
      ranking_boost_snapshot, plan_snapshot
    ) values (
      p_profile_id, v_plan.id, 'PENDING_PAYMENT', v_plan.monthly_lead_quota,
      v_plan.ranking_boost_points,
      jsonb_build_object(
        'code', v_plan.code, 'name', v_plan.name, 'price_amount', v_plan.price_amount,
        'currency', v_plan.currency, 'billing_interval', v_plan.billing_interval
      )
    ) returning id into v_subscription_id;
  else
    update public.subscriptions
    set plan_id = v_plan.id,
        lead_quota_snapshot = v_plan.monthly_lead_quota,
        ranking_boost_snapshot = v_plan.ranking_boost_points,
        plan_snapshot = jsonb_build_object(
          'code', v_plan.code, 'name', v_plan.name, 'price_amount', v_plan.price_amount,
          'currency', v_plan.currency, 'billing_interval', v_plan.billing_interval
        ),
        updated_at = statement_timestamp()
    where id = v_subscription_id;
  end if;

  return v_subscription_id;
end;
$$;

revoke all on function private.select_professional_plan(uuid, text) from public, anon, authenticated;
grant execute on function private.select_professional_plan(uuid, text) to authenticated, service_role;

create or replace function public.select_professional_plan(p_profile_id uuid, p_plan_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.select_professional_plan(p_profile_id, p_plan_code); $$;

revoke all on function public.select_professional_plan(uuid, text) from public, anon;
grant execute on function public.select_professional_plan(uuid, text) to authenticated, service_role;

create or replace function private.submit_professional_credential(
  p_profile_id uuid,
  p_credential_type_id uuid,
  p_title text,
  p_object_path text,
  p_issuing_entity text default null,
  p_jurisdiction text default null,
  p_registration_number text default null,
  p_issued_on date default null,
  p_expires_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credential_id uuid;
begin
  if (select auth.uid()) is null or not private.owns_professional_profile(p_profile_id) then
    raise exception 'Not authorized for this profile' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;
  if p_object_path not like (select auth.uid())::text || '/%'
     or p_object_path like '%..%'
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'professional-credentials' and name = p_object_path
     ) then
    raise exception 'Credential object is missing or not owned by caller' using errcode = '42501';
  end if;
  if not exists (select 1 from public.credential_types where id = p_credential_type_id and is_active) then
    raise exception 'Unknown credential type' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.professional_profile_types ppt
    join public.verification_rules vr
      on vr.professional_type_id = ppt.professional_type_id
     and vr.credential_type_id = p_credential_type_id
    where ppt.professional_profile_id = p_profile_id
      and vr.is_active
      and vr.requirement_level in ('REQUIRED', 'JURISDICTIONAL')
      and vr.jurisdiction_required
  ) and (
    nullif(trim(p_jurisdiction), '') is null
    or nullif(trim(p_registration_number), '') is null
  ) then
    raise exception 'Jurisdiction and registration number are required for this credential'
      using errcode = '23514';
  end if;

  insert into private.credentials (
    professional_profile_id, credential_type_id, title, issuing_entity,
    jurisdiction, registration_number, object_path, issued_on, expires_on
  ) values (
    p_profile_id, p_credential_type_id, trim(p_title), nullif(trim(p_issuing_entity), ''),
    nullif(trim(p_jurisdiction), ''), nullif(trim(p_registration_number), ''),
    p_object_path, p_issued_on, p_expires_on
  ) returning id into v_credential_id;

  insert into private.verifications (credential_id) values (v_credential_id);
  return v_credential_id;
end;
$$;

revoke all on function private.submit_professional_credential(uuid, uuid, text, text, text, text, text, date, date)
  from public, anon, authenticated;
grant execute on function private.submit_professional_credential(uuid, uuid, text, text, text, text, text, date, date)
  to authenticated, service_role;

create or replace function public.submit_professional_credential(
  p_profile_id uuid,
  p_credential_type_id uuid,
  p_title text,
  p_object_path text,
  p_issuing_entity text default null,
  p_jurisdiction text default null,
  p_registration_number text default null,
  p_issued_on date default null,
  p_expires_on date default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_professional_credential(
    p_profile_id, p_credential_type_id, p_title, p_object_path,
    p_issuing_entity, p_jurisdiction, p_registration_number, p_issued_on, p_expires_on
  );
$$;

revoke all on function public.submit_professional_credential(uuid, uuid, text, text, text, text, text, date, date)
  from public, anon;
grant execute on function public.submit_professional_credential(uuid, uuid, text, text, text, text, text, date, date)
  to authenticated, service_role;

create or replace function private.my_credential_statuses()
returns table (
  credential_id uuid,
  professional_profile_id uuid,
  credential_type_id uuid,
  title text,
  issuing_entity text,
  jurisdiction text,
  object_path text,
  issued_on date,
  expires_on date,
  verification_status text,
  reviewed_at timestamptz,
  valid_until date,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.professional_profile_id, c.credential_type_id, c.title,
         c.issuing_entity, c.jurisdiction, c.object_path, c.issued_on, c.expires_on,
         coalesce(v.status, 'PENDING'), v.reviewed_at, v.valid_until, c.submitted_at
  from private.credentials c
  join public.professional_profiles p on p.id = c.professional_profile_id
  left join lateral (
    select verification.status, verification.reviewed_at, verification.valid_until
    from private.verifications verification
    where verification.credential_id = c.id
    order by verification.created_at desc
    limit 1
  ) v on true
  where (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and p.user_id = (select auth.uid())
  order by c.submitted_at desc;
$$;

revoke all on function private.my_credential_statuses() from public, anon, authenticated;
grant execute on function private.my_credential_statuses() to authenticated, service_role;

create or replace function public.my_credential_statuses()
returns table (
  credential_id uuid,
  professional_profile_id uuid,
  credential_type_id uuid,
  title text,
  issuing_entity text,
  jurisdiction text,
  object_path text,
  issued_on date,
  expires_on date,
  verification_status text,
  reviewed_at timestamptz,
  valid_until date,
  submitted_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_credential_statuses(); $$;

revoke all on function public.my_credential_statuses() from public, anon;
grant execute on function public.my_credential_statuses() to authenticated, service_role;

create or replace function private.my_professional_leads(
  p_profile_id uuid default null,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  lead_id uuid,
  professional_profile_id uuid,
  status text,
  created_at timestamptz,
  need_id uuid,
  need_name text,
  full_name text,
  email text,
  phone text,
  message text,
  contact_preference text,
  source text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.professional_profile_id, l.status, l.created_at,
         l.need_id, n.name, c.full_name, c.email, c.phone, c.message,
         c.contact_preference, l.source, l.campaign, l.utm_source,
         l.utm_medium, l.utm_campaign
  from public.leads l
  join private.lead_contacts c on c.lead_id = l.id
  left join public.needs n on n.id = l.need_id
  join public.professional_profiles p on p.id = l.professional_profile_id
  where (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and (p.user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
    and (p_profile_id is null or l.professional_profile_id = p_profile_id)
    and (p_before is null or l.created_at < p_before)
  order by l.created_at desc, l.id desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function private.my_professional_leads(uuid, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function private.my_professional_leads(uuid, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.my_professional_leads(
  p_profile_id uuid default null,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  lead_id uuid,
  professional_profile_id uuid,
  status text,
  created_at timestamptz,
  need_id uuid,
  need_name text,
  full_name text,
  email text,
  phone text,
  message text,
  contact_preference text,
  source text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_professional_leads(p_profile_id, p_before, p_limit); $$;

revoke all on function public.my_professional_leads(uuid, timestamptz, integer) from public, anon;
grant execute on function public.my_professional_leads(uuid, timestamptz, integer)
  to authenticated, service_role;

create or replace function private.update_professional_lead_status(p_lead_id uuid, p_new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_status text;
  v_is_admin boolean := private.has_any_role(array['ADMIN', 'SUPERADMIN']);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;

  select l.status into v_old_status
  from public.leads l
  join public.professional_profiles p on p.id = l.professional_profile_id
  where l.id = p_lead_id
    and (p.user_id = (select auth.uid()) or v_is_admin)
  for update of l;

  if not found then
    raise exception 'Lead not found or not assigned to caller' using errcode = '42501';
  end if;
  if p_new_status not in ('NEW', 'VIEWED', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM') then
    raise exception 'Invalid lead status' using errcode = '22023';
  end if;
  if not v_is_admin and not (
    p_new_status = v_old_status
    or (v_old_status = 'NEW' and p_new_status in ('VIEWED', 'CLOSED', 'SPAM'))
    or (v_old_status = 'VIEWED' and p_new_status in ('CONTACTED', 'CLOSED', 'SPAM'))
    or (v_old_status = 'CONTACTED' and p_new_status in ('QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM'))
    or (v_old_status = 'QUALIFIED' and p_new_status in ('CONVERTED', 'CLOSED', 'SPAM'))
    or (v_old_status = 'CONVERTED' and p_new_status = 'CLOSED')
  ) then
    raise exception 'Invalid lead status transition' using errcode = '22023';
  end if;

  update public.leads
  set status = p_new_status,
      viewed_at = case when p_new_status = 'VIEWED' then coalesce(viewed_at, statement_timestamp()) else viewed_at end,
      contacted_at = case when p_new_status in ('CONTACTED', 'QUALIFIED', 'CONVERTED') then coalesce(contacted_at, statement_timestamp()) else contacted_at end,
      closed_at = case when p_new_status in ('CLOSED', 'SPAM') then coalesce(closed_at, statement_timestamp()) else closed_at end,
      updated_at = statement_timestamp()
  where id = p_lead_id;
end;
$$;

revoke all on function private.update_professional_lead_status(uuid, text)
  from public, anon, authenticated;
grant execute on function private.update_professional_lead_status(uuid, text)
  to authenticated, service_role;

create or replace function public.update_professional_lead_status(p_lead_id uuid, p_new_status text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_professional_lead_status(p_lead_id, p_new_status); $$;

revoke all on function public.update_professional_lead_status(uuid, text) from public, anon;
grant execute on function public.update_professional_lead_status(uuid, text)
  to authenticated, service_role;

-- The public read model contains only publishable fields and stable taxonomy IDs.
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
  p.starting_price,
  p.currency,
  p.show_starting_price,
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
  p.search_vector,
  coalesce((select array_agg(x.professional_type_id order by x.professional_type_id) from public.professional_profile_types x where x.professional_profile_id = p.id), '{}'::uuid[]) as professional_type_ids,
  coalesce((select array_agg(x.need_id order by x.need_id) from public.professional_needs x where x.professional_profile_id = p.id), '{}'::uuid[]) as need_ids,
  coalesce((select array_agg(x.service_id order by x.service_id) from public.professional_services x where x.professional_profile_id = p.id and x.is_active), '{}'::uuid[]) as service_ids,
  coalesce((select array_agg(x.specialty_id order by x.specialty_id) from public.professional_specialties x where x.professional_profile_id = p.id), '{}'::uuid[]) as specialty_ids,
  coalesce((select array_agg(x.audience_id order by x.audience_id) from public.professional_audiences x where x.professional_profile_id = p.id), '{}'::uuid[]) as audience_ids,
  coalesce((select array_agg(x.modality_id order by x.modality_id) from public.professional_modalities x where x.professional_profile_id = p.id), '{}'::uuid[]) as modality_ids,
  coalesce((select array_agg(x.location_id order by x.location_id) from public.professional_locations x where x.professional_profile_id = p.id), '{}'::uuid[]) as location_ids,
  coalesce((select array_agg(x.language_id order by x.language_id) from public.professional_languages x where x.professional_profile_id = p.id), '{}'::uuid[]) as language_ids,
  coalesce((select array_agg(x.industry_id order by x.industry_id) from public.professional_industries x where x.professional_profile_id = p.id), '{}'::uuid[]) as industry_ids,
  coalesce((select array_agg(x.career_stage_id order by x.career_stage_id) from public.professional_career_stages x where x.professional_profile_id = p.id), '{}'::uuid[]) as career_stage_ids,
  coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.professional_profile_id = p.id and r.status = 'APPROVED'), 0) as review_rating,
  (select count(*) from public.reviews r where r.professional_profile_id = p.id and r.status = 'APPROVED') as review_count
from public.professional_profiles p
where private.is_professional_publicly_visible(p.id);

-- Owner/admin workflows must read verification through this model instead of
-- the denormalized cache on professional_profiles. This keeps date-based
-- credential expiry accurate without granting direct access to stale state.
create view public.professional_profile_statuses
with (security_invoker = true, security_barrier = true)
as
select
  p.id as professional_profile_id,
  p.publication_status,
  private.visible_professional_verification_state(p.id) as verification_state,
  p.published_at,
  p.updated_at
from public.professional_profiles p;

create or replace function private.my_professional_profile()
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
  starting_price numeric,
  currency text,
  show_starting_price boolean,
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
security definer
set search_path = ''
as $$
  select
    p.id, p.slug, p.first_name, p.last_name, p.pronouns, p.avatar_path,
    p.headline, p.bio, p.approach, p.experience_summary, p.education_summary,
    p.years_experience, p.starting_price, p.currency, p.show_starting_price,
    p.availability_status, p.next_available_on, p.availability_note,
    p.linkedin_url, p.website_url, p.instagram_url, p.publication_status,
    private.calculate_professional_verification_state(p.id), p.published_at,
    p.is_accepting_leads, p.created_at, p.updated_at
  from public.professional_profiles p
  where (select auth.uid()) is not null and p.user_id = (select auth.uid());
$$;

revoke all on function private.my_professional_profile() from public, anon, authenticated;
grant execute on function private.my_professional_profile() to authenticated, service_role;

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
  starting_price numeric,
  currency text,
  show_starting_price boolean,
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
as $$ select * from private.my_professional_profile(); $$;

revoke all on function public.my_professional_profile() from public, anon;
grant execute on function public.my_professional_profile() to authenticated, service_role;

create or replace function private.assert_rank_request(
  p_need_ids uuid[],
  p_professional_type_ids uuid[],
  p_service_ids uuid[],
  p_specialty_ids uuid[],
  p_audience_ids uuid[],
  p_modality_ids uuid[],
  p_location_ids uuid[],
  p_language_ids uuid[],
  p_industry_ids uuid[],
  p_career_stage_ids uuid[],
  p_budget_max numeric,
  p_search text,
  p_search_signature text,
  p_limit integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sizes integer[] := array[
    cardinality(coalesce(p_need_ids, '{}')),
    cardinality(coalesce(p_professional_type_ids, '{}')),
    cardinality(coalesce(p_service_ids, '{}')),
    cardinality(coalesce(p_specialty_ids, '{}')),
    cardinality(coalesce(p_audience_ids, '{}')),
    cardinality(coalesce(p_modality_ids, '{}')),
    cardinality(coalesce(p_location_ids, '{}')),
    cardinality(coalesce(p_language_ids, '{}')),
    cardinality(coalesce(p_industry_ids, '{}')),
    cardinality(coalesce(p_career_stage_ids, '{}'))
  ];
begin
  if (select max(x) from unnest(v_sizes) x) > 20
     or (select sum(x) from unnest(v_sizes) x) > 80 then
    raise exception 'Too many ranking filters' using errcode = '22023';
  end if;
  if p_search is not null and (
    char_length(p_search) > 120 or octet_length(p_search) > 256
  ) then
    raise exception 'Search query is too long' using errcode = '22023';
  end if;
  if p_search_signature is not null and octet_length(p_search_signature) > 128 then
    raise exception 'Search signature is too long' using errcode = '22023';
  end if;
  if p_budget_max is not null and (p_budget_max < 0 or p_budget_max > 1000000000) then
    raise exception 'Budget is outside the supported range' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'Ranking limit is outside the supported range' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function private.assert_rank_request(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) from public, anon, authenticated;
grant execute on function private.assert_rank_request(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) to anon, authenticated, service_role;

create or replace function private.assert_matching_request(p_option_ids uuid[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if cardinality(coalesce(p_option_ids, '{}')) > 32 then
    raise exception 'Too many matching options' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function private.assert_matching_request(uuid[])
  from public, anon, authenticated;
grant execute on function private.assert_matching_request(uuid[])
  to anon, authenticated, service_role;

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
        or d.search_vector @@ websearch_to_tsquery('spanish', trim(p_search))
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

create or replace function public.explain_matching(p_option_ids uuid[])
returns table (
  target_kind text,
  target_id uuid,
  total_weight numeric,
  reasons text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with request_guard as materialized (
    select private.assert_matching_request(p_option_ids) as allowed
  ), selected_rules as (
    select r.*
    from public.matching_rules r
    join public.matching_options o on o.id = r.option_id and o.is_active
    join public.matching_questions q on q.id = o.question_id and q.is_active
    cross join request_guard g
    where g.allowed
      and r.is_active and r.option_id = any(coalesce(p_option_ids, '{}'::uuid[]))
  ), expanded as (
    select
      case
        when need_id is not null then 'NEED'
        when service_id is not null then 'SERVICE'
        when professional_type_id is not null then 'PROFESSIONAL_TYPE'
        when specialty_id is not null then 'SPECIALTY'
        when audience_id is not null then 'AUDIENCE'
        when modality_id is not null then 'MODALITY'
        when language_id is not null then 'LANGUAGE'
        when industry_id is not null then 'INDUSTRY'
        else 'CAREER_STAGE'
      end as kind,
      coalesce(need_id, service_id, professional_type_id, specialty_id, audience_id,
               modality_id, language_id, industry_id, career_stage_id) as id,
      weight,
      reason
    from selected_rules
  )
  select kind, id, sum(weight), array_agg(distinct reason order by reason)
  from expanded
  group by kind, id
  order by sum(weight) desc, kind, id;
$$;

revoke all on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) from public;
grant execute on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) to anon, authenticated, service_role;

revoke all on function public.explain_matching(uuid[]) from public;
grant execute on function public.explain_matching(uuid[]) to anon, authenticated, service_role;

create or replace function private.admin_pending_professional_profiles(
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
  starting_price numeric,
  currency text,
  verification_state text,
  publication_status text,
  updated_at timestamptz,
  professional_type_names text[],
  has_regulated_type boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.slug, p.first_name, p.last_name, p.headline, p.bio, p.approach,
    p.experience_summary, p.education_summary, p.years_experience,
    p.starting_price, p.currency,
    private.calculate_professional_verification_state(p.id),
    p.publication_status, p.updated_at,
    coalesce(array_agg(pt.name order by pt.name) filter (where pt.id is not null), '{}'),
    coalesce(bool_or(pt.is_regulated), false)
  from public.professional_profiles p
  left join public.professional_profile_types ppt on ppt.professional_profile_id = p.id
  left join public.professional_types pt on pt.id = ppt.professional_type_id
  where (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and private.has_any_role(array['ADMIN', 'SUPERADMIN'])
    and p.publication_status = 'PENDING_REVIEW'
  group by p.id
  order by p.updated_at, p.id
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function private.admin_pending_professional_profiles(integer)
  from public, anon, authenticated;
grant execute on function private.admin_pending_professional_profiles(integer)
  to authenticated, service_role;

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
  starting_price numeric,
  currency text,
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
as $$ select * from private.admin_pending_professional_profiles(p_limit); $$;

revoke all on function public.admin_pending_professional_profiles(integer)
  from public, anon;
grant execute on function public.admin_pending_professional_profiles(integer)
  to authenticated, service_role;

create or replace function private.admin_pending_credentials(
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  credential_id uuid,
  professional_profile_id uuid,
  professional_name text,
  credential_type_id uuid,
  credential_type_name text,
  title text,
  issuing_entity text,
  jurisdiction text,
  registration_number text,
  object_path text,
  issued_on date,
  expires_on date,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.professional_profile_id, concat_ws(' ', p.first_name, p.last_name),
         c.credential_type_id, ct.name, c.title, c.issuing_entity, c.jurisdiction,
         c.registration_number, c.object_path, c.issued_on, c.expires_on, c.submitted_at
  from private.credentials c
  join private.verifications v on v.credential_id = c.id and v.status = 'PENDING'
  join public.professional_profiles p on p.id = c.professional_profile_id
  join public.credential_types ct on ct.id = c.credential_type_id
  where (select auth.uid()) is not null
    and private.has_current_legal_acceptance()
    and private.has_any_role(array['ADMIN', 'SUPERADMIN'])
    and (p_before is null or c.submitted_at < p_before)
  order by c.submitted_at, c.id
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function private.admin_pending_credentials(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function private.admin_pending_credentials(timestamptz, integer)
  to authenticated, service_role;

create or replace function public.admin_pending_credentials(
  p_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  credential_id uuid,
  professional_profile_id uuid,
  professional_name text,
  credential_type_id uuid,
  credential_type_name text,
  title text,
  issuing_entity text,
  jurisdiction text,
  registration_number text,
  object_path text,
  issued_on date,
  expires_on date,
  submitted_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.admin_pending_credentials(p_before, p_limit); $$;

revoke all on function public.admin_pending_credentials(timestamptz, integer) from public, anon;
grant execute on function public.admin_pending_credentials(timestamptz, integer)
  to authenticated, service_role;

create or replace function private.admin_resolve_credential(
  p_credential_id uuid,
  p_status text,
  p_internal_notes text default null,
  p_valid_until date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verification_id uuid;
  v_rule_valid_until date;
  v_credential_expires_on date;
  v_effective_valid_until date;
begin
  if (select auth.uid()) is null or not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;
  if p_status not in ('APPROVED', 'REJECTED') then
    raise exception 'Resolution must be APPROVED or REJECTED' using errcode = '22023';
  end if;
  if p_status = 'REJECTED' and nullif(trim(p_internal_notes), '') is null then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;
  if p_status = 'APPROVED' and exists (
    select 1
    from private.credentials c
    join public.professional_profile_types ppt
      on ppt.professional_profile_id = c.professional_profile_id
    join public.verification_rules vr
      on vr.professional_type_id = ppt.professional_type_id
     and vr.credential_type_id = c.credential_type_id
    where c.id = p_credential_id
      and vr.is_active
      and vr.requirement_level in ('REQUIRED', 'JURISDICTIONAL')
      and vr.jurisdiction_required
      and (
        nullif(trim(c.jurisdiction), '') is null
        or nullif(trim(c.registration_number), '') is null
      )
  ) then
    raise exception 'Jurisdiction and registration number are required before approval'
      using errcode = '23514';
  end if;

  if p_status = 'APPROVED' then
    select
      c.expires_on,
      min(
        (current_date + make_interval(months => vr.expires_after_months::integer))::date
      ) filter (where vr.expires_after_months is not null)
    into v_credential_expires_on, v_rule_valid_until
    from private.credentials c
    left join public.professional_profile_types ppt
      on ppt.professional_profile_id = c.professional_profile_id
    left join public.verification_rules vr
      on vr.professional_type_id = ppt.professional_type_id
     and vr.credential_type_id = c.credential_type_id
     and vr.is_active
    where c.id = p_credential_id
    group by c.expires_on;

    v_effective_valid_until := p_valid_until;
    if v_rule_valid_until is not null and (
      v_effective_valid_until is null or v_rule_valid_until < v_effective_valid_until
    ) then
      v_effective_valid_until := v_rule_valid_until;
    end if;
    if v_credential_expires_on is not null and (
      v_effective_valid_until is null or v_credential_expires_on < v_effective_valid_until
    ) then
      v_effective_valid_until := v_credential_expires_on;
    end if;
    if v_effective_valid_until is not null and v_effective_valid_until < current_date then
      raise exception 'Credential validity has already expired' using errcode = '23514';
    end if;
  end if;

  update private.verifications
  set status = p_status,
      reviewer_user_id = (select auth.uid()),
      internal_notes = nullif(trim(p_internal_notes), ''),
      reviewed_at = statement_timestamp(),
      valid_until = case when p_status = 'APPROVED' then v_effective_valid_until else null end,
      updated_at = statement_timestamp()
  where credential_id = p_credential_id and status = 'PENDING'
  returning id into v_verification_id;

  if v_verification_id is null then
    raise exception 'Pending credential verification not found' using errcode = '22023';
  end if;

  insert into private.audit_log (
    actor_user_id, actor_db_role, action, entity_schema, entity_table,
    entity_id, changed_fields, metadata
  ) values (
    (select auth.uid()),
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), session_user),
    'CREDENTIAL_RESOLVED', 'private', 'verifications',
    v_verification_id::text, array['status', 'reviewer_user_id', 'reviewed_at', 'valid_until'],
    jsonb_strip_nulls(jsonb_build_object(
      'status', p_status, 'valid_until', v_effective_valid_until
    ))
  );

  return v_verification_id;
end;
$$;

revoke all on function private.admin_resolve_credential(uuid, text, text, date)
  from public, anon, authenticated;
grant execute on function private.admin_resolve_credential(uuid, text, text, date)
  to authenticated, service_role;

create or replace function public.admin_resolve_credential(
  p_credential_id uuid,
  p_status text,
  p_internal_notes text default null,
  p_valid_until date default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.admin_resolve_credential(
    p_credential_id, p_status, p_internal_notes, p_valid_until
  );
$$;

revoke all on function public.admin_resolve_credential(uuid, text, text, date) from public, anon;
grant execute on function public.admin_resolve_credential(uuid, text, text, date)
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
  if (select auth.uid()) is null or not private.has_any_role(array['ADMIN', 'SUPERADMIN']) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if not private.has_current_legal_acceptance() then
    raise exception 'Current legal documents must be accepted' using errcode = '42501';
  end if;
  if p_status not in ('PUBLISHED', 'REJECTED', 'SUSPENDED') then
    raise exception 'Invalid publication resolution' using errcode = '22023';
  end if;
  if p_status in ('REJECTED', 'SUSPENDED') and nullif(trim(p_reason), '') is null then
    raise exception 'A reason is required' using errcode = '23514';
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
    raise exception 'Regulated professional requires approved credentials' using errcode = '23514';
  end if;

  update public.professional_profiles
  set publication_status = p_status,
      published_at = case when p_status = 'PUBLISHED' then coalesce(published_at, statement_timestamp()) else null end,
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
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), session_user),
    'PUBLICATION_STATUS_SET', 'public', 'professional_profiles',
    p_profile_id::text, array['publication_status', 'published_at'],
    jsonb_strip_nulls(jsonb_build_object('status', p_status, 'reason', left(p_reason, 1000)))
  );
end;
$$;

revoke all on function private.admin_set_professional_publication(uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.admin_set_professional_publication(uuid, text, text)
  to authenticated, service_role;

create or replace function public.admin_set_professional_publication(
  p_profile_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_professional_publication(p_profile_id, p_status, p_reason); $$;

revoke all on function public.admin_set_professional_publication(uuid, text, text) from public, anon;
grant execute on function public.admin_set_professional_publication(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Timestamps and audit hooks
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'user_profiles', 'professional_types', 'credential_types', 'verification_rules',
    'needs', 'services', 'specialties', 'audiences', 'modalities', 'locations',
    'languages', 'industries', 'career_stages', 'plans', 'plan_entitlements',
    'professional_profiles', 'professional_services', 'professional_availability',
    'leads', 'reviews', 'subscriptions', 'professional_ranking_signals',
    'professional_metrics_daily', 'article_categories', 'articles', 'institutions',
    'agreements', 'agreement_professionals', 'matching_questions', 'matching_options',
    'matching_sessions', 'notifications'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      v_table || '_set_updated_at', v_table
    );
  end loop;

  foreach v_table in array array[
    'professional_contacts', 'credentials', 'verifications', 'lead_contacts',
    'payment_customers', 'notification_outbox', 'rate_limit_buckets'
  ] loop
    execute format(
      'create trigger %I before update on private.%I for each row execute function private.set_updated_at()',
      v_table || '_set_updated_at', v_table
    );
  end loop;
end;
$$;

create trigger audit_user_roles
after insert or update or delete on public.user_roles
for each row execute function private.audit_row_change();
create trigger audit_professional_profiles
after insert or update or delete on public.professional_profiles
for each row execute function private.audit_row_change();
create trigger audit_verifications
after insert or update or delete on private.verifications
for each row execute function private.audit_row_change();
create trigger audit_subscriptions
after insert or update or delete on public.subscriptions
for each row execute function private.audit_row_change();
create trigger audit_plans
after insert or update or delete on public.plans
for each row execute function private.audit_row_change();
create trigger audit_reviews
after insert or update or delete on public.reviews
for each row execute function private.audit_row_change();
create trigger audit_articles
after insert or update or delete on public.articles
for each row execute function private.audit_row_change();
create trigger audit_agreements
after insert or update or delete on public.agreements
for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------------
-- RLS is mandatory on every table, including private defense-in-depth tables.
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'roles', 'user_profiles', 'user_roles', 'professional_types', 'credential_types',
    'verification_rules', 'needs', 'services', 'specialties', 'audiences',
    'modalities', 'locations', 'languages', 'industries', 'career_stages', 'plans',
    'plan_entitlements', 'professional_profiles', 'professional_profile_types',
    'professional_needs', 'professional_services', 'professional_specialties',
    'professional_audiences', 'professional_modalities', 'professional_locations',
    'professional_languages', 'professional_industries', 'professional_career_stages',
    'professional_availability', 'leads', 'reviews', 'favorites', 'subscriptions',
    'professional_ranking_signals', 'professional_metrics_daily', 'article_categories',
    'articles', 'institutions', 'agreements', 'agreement_professionals',
    'agreement_services', 'matching_questions', 'matching_options', 'matching_rules',
    'matching_sessions', 'matching_answers', 'matching_recommendations',
    'notifications', 'analytics_events'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
  end loop;

  foreach v_table in array array[
    'legal_document_versions', 'legal_acceptances', 'professional_contacts',
    'credentials', 'verifications', 'lead_contacts',
    'lead_status_history', 'payment_customers', 'subscription_events',
    'matching_session_tokens', 'notification_outbox', 'rate_limit_buckets', 'audit_log'
  ] loop
    execute format('alter table private.%I enable row level security', v_table);
    execute format('alter table private.%I force row level security', v_table);
  end loop;
end;
$$;

-- Identity policies.
create policy user_profiles_read_own_or_admin
on public.user_profiles for select to authenticated
using ((select auth.uid()) = id or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy user_profiles_update_own_or_admin
on public.user_profiles for update to authenticated
using ((select auth.uid()) = id or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check ((select auth.uid()) = id or private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy roles_authenticated_read
on public.roles for select to authenticated using (true);
create policy roles_superadmin_insert
on public.roles for insert to authenticated
with check (private.has_any_role(array['SUPERADMIN']));
create policy roles_superadmin_update
on public.roles for update to authenticated
using (private.has_any_role(array['SUPERADMIN']))
with check (private.has_any_role(array['SUPERADMIN']));
create policy roles_superadmin_delete
on public.roles for delete to authenticated
using (private.has_any_role(array['SUPERADMIN']));

create policy user_roles_read_own_or_admin
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy user_roles_superadmin_insert
on public.user_roles for insert to authenticated
with check (private.has_any_role(array['SUPERADMIN']));
create policy user_roles_superadmin_update
on public.user_roles for update to authenticated
using (private.has_any_role(array['SUPERADMIN']))
with check (private.has_any_role(array['SUPERADMIN']));
create policy user_roles_superadmin_delete
on public.user_roles for delete to authenticated
using (private.has_any_role(array['SUPERADMIN']));

-- Public, administrable taxonomies. Each named table has the same explicit
-- active-row read contract and admin-only mutation contract.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'professional_types', 'credential_types', 'needs', 'services', 'specialties',
    'audiences', 'modalities', 'locations', 'languages', 'industries',
    'career_stages', 'plans', 'article_categories', 'matching_questions',
    'matching_options', 'matching_rules'
  ] loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_active or private.has_any_role(array[''ADMIN'', ''SUPERADMIN'']))',
      v_table || '_public_read_active', v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_any_role(array[''ADMIN'', ''SUPERADMIN'']))',
      v_table || '_admin_insert', v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_any_role(array[''ADMIN'', ''SUPERADMIN''])) with check (private.has_any_role(array[''ADMIN'', ''SUPERADMIN'']))',
      v_table || '_admin_update', v_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_any_role(array[''ADMIN'', ''SUPERADMIN'']))',
      v_table || '_admin_delete', v_table
    );
  end loop;
end;
$$;

create policy verification_rules_public_read_active
on public.verification_rules for select to anon, authenticated
using (is_active or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy verification_rules_admin_insert
on public.verification_rules for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy verification_rules_admin_update
on public.verification_rules for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy verification_rules_admin_delete
on public.verification_rules for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy plan_entitlements_public_read
on public.plan_entitlements for select to anon, authenticated
using (
  exists (select 1 from public.plans p where p.id = plan_id and p.is_active)
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);
create policy plan_entitlements_admin_insert
on public.plan_entitlements for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy plan_entitlements_admin_update
on public.plan_entitlements for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy plan_entitlements_admin_delete
on public.plan_entitlements for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

-- Directory and owner policies.
create policy professional_profiles_public_or_owner_read
on public.professional_profiles for select to anon, authenticated
using (
  private.is_professional_publicly_visible(id)
  or ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or private.has_any_role(array['ADMIN', 'SUPERADMIN', 'EDITOR'])
);
create policy professional_profiles_owner_insert
on public.professional_profiles for insert to authenticated
with check (
  user_id = (select auth.uid()) and publication_status = 'DRAFT'
  and verification_state = 'NOT_VERIFIED' and not is_demo
  and private.has_current_legal_acceptance()
);
create policy professional_profiles_owner_or_admin_update
on public.professional_profiles for update to authenticated
using (
  private.has_current_legal_acceptance()
  and (user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
)
with check (
  private.has_current_legal_acceptance()
  and (user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
);
create policy professional_profiles_owner_draft_or_admin_delete
on public.professional_profiles for delete to authenticated
using (
  private.has_current_legal_acceptance()
  and (
    (user_id = (select auth.uid()) and publication_status = 'DRAFT')
    or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
  )
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'professional_profile_types', 'professional_needs', 'professional_services',
    'professional_specialties', 'professional_audiences', 'professional_modalities',
    'professional_locations', 'professional_languages', 'professional_industries',
    'professional_career_stages', 'professional_availability'
  ] loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (private.can_view_professional_profile(professional_profile_id))',
      v_table || '_visible_read', v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_current_legal_acceptance() and (private.owns_professional_profile(professional_profile_id) or private.has_any_role(array[''ADMIN'', ''SUPERADMIN''])))',
      v_table || '_owner_insert', v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_current_legal_acceptance() and (private.owns_professional_profile(professional_profile_id) or private.has_any_role(array[''ADMIN'', ''SUPERADMIN'']))) with check (private.has_current_legal_acceptance() and (private.owns_professional_profile(professional_profile_id) or private.has_any_role(array[''ADMIN'', ''SUPERADMIN''])))',
      v_table || '_owner_update', v_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_current_legal_acceptance() and (private.owns_professional_profile(professional_profile_id) or private.has_any_role(array[''ADMIN'', ''SUPERADMIN''])))',
      v_table || '_owner_delete', v_table
    );
  end loop;
end;
$$;

create policy ranking_signals_visible_read
on public.professional_ranking_signals for select to anon, authenticated
using (private.can_view_professional_profile(professional_profile_id));
create policy ranking_signals_admin_insert
on public.professional_ranking_signals for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy ranking_signals_admin_update
on public.professional_ranking_signals for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy ranking_signals_admin_delete
on public.professional_ranking_signals for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy professional_metrics_owner_or_admin_read
on public.professional_metrics_daily for select to authenticated
using (
  private.owns_professional_profile(professional_profile_id)
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);

-- Leads are created only by the service-role RPC. RLS exposes the non-PII shell.
create policy leads_participant_or_admin_read
on public.leads for select to authenticated
using (
  consumer_user_id = (select auth.uid())
  or private.owns_professional_profile(professional_profile_id)
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);

create policy reviews_public_or_owner_read
on public.reviews for select to anon, authenticated
using (
  status = 'APPROVED'
  or ((select auth.uid()) is not null and reviewer_user_id = (select auth.uid()))
  or private.has_any_role(array['ADMIN', 'SUPERADMIN', 'EDITOR'])
);
create policy reviews_authenticated_insert
on public.reviews for insert to authenticated
with check (reviewer_user_id = (select auth.uid()) and status = 'PENDING' and not is_demo);

create policy favorites_owner_manage
on public.favorites for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy subscriptions_owner_or_admin_read
on public.subscriptions for select to authenticated
using (
  private.owns_professional_profile(professional_profile_id)
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);

-- Content policies. Author mutations omit moderation columns at the GRANT layer.
create policy articles_public_author_or_editor_read
on public.articles for select to anon, authenticated
using (
  status = 'PUBLISHED'
  or (author_profile_id is not null and private.owns_professional_profile(author_profile_id))
  or private.has_any_role(array['EDITOR', 'ADMIN', 'SUPERADMIN'])
);
create policy articles_author_insert
on public.articles for insert to authenticated
with check (
  author_profile_id is not null and private.owns_professional_profile(author_profile_id)
  and status = 'DRAFT' and not is_demo
);
create policy articles_author_update
on public.articles for update to authenticated
using (
  (author_profile_id is not null and private.owns_professional_profile(author_profile_id))
  or private.has_any_role(array['EDITOR', 'ADMIN', 'SUPERADMIN'])
)
with check (
  (author_profile_id is not null and private.owns_professional_profile(author_profile_id))
  or private.has_any_role(array['EDITOR', 'ADMIN', 'SUPERADMIN'])
);
create policy articles_author_draft_delete
on public.articles for delete to authenticated
using (
  (author_profile_id is not null and private.owns_professional_profile(author_profile_id) and status = 'DRAFT')
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);

create policy institutions_public_read
on public.institutions for select to anon, authenticated
using (is_active or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy institutions_admin_insert
on public.institutions for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy institutions_admin_update
on public.institutions for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy institutions_admin_delete
on public.institutions for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy agreements_public_read
on public.agreements for select to anon, authenticated
using ((status = 'PUBLISHED' and is_public) or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreements_admin_insert
on public.agreements for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreements_admin_update
on public.agreements for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreements_admin_delete
on public.agreements for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy agreement_professionals_public_or_member_read
on public.agreement_professionals for select to anon, authenticated
using (
  (
    status = 'ACTIVE'
    and private.can_view_professional_profile(professional_profile_id)
    and exists (
      select 1 from public.agreements a
      where a.id = agreement_id and a.status = 'PUBLISHED' and a.is_public
    )
  )
  or private.owns_professional_profile(professional_profile_id)
  or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);
create policy agreement_professionals_admin_insert
on public.agreement_professionals for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreement_professionals_admin_update
on public.agreement_professionals for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreement_professionals_admin_delete
on public.agreement_professionals for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

create policy agreement_services_public_read
on public.agreement_services for select to anon, authenticated
using (
  exists (
    select 1 from public.agreements a
    where a.id = agreement_id and a.status = 'PUBLISHED' and a.is_public
  ) or private.has_any_role(array['ADMIN', 'SUPERADMIN'])
);
create policy agreement_services_admin_insert
on public.agreement_services for insert to authenticated
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreement_services_admin_update
on public.agreement_services for update to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']))
with check (private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy agreement_services_admin_delete
on public.agreement_services for delete to authenticated
using (private.has_any_role(array['ADMIN', 'SUPERADMIN']));

-- Matching sessions are written by server endpoints. Authenticated users can
-- read only their own completed or in-progress history.
create policy matching_sessions_owner_read
on public.matching_sessions for select to authenticated
using (user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']));
create policy matching_answers_owner_read
on public.matching_answers for select to authenticated
using (exists (
  select 1 from public.matching_sessions s
  where s.id = matching_session_id
    and (s.user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
));
create policy matching_recommendations_owner_read
on public.matching_recommendations for select to authenticated
using (exists (
  select 1 from public.matching_sessions s
  where s.id = matching_session_id
    and (s.user_id = (select auth.uid()) or private.has_any_role(array['ADMIN', 'SUPERADMIN']))
));

create policy notifications_owner_read
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));
create policy notifications_owner_mark_read
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- No policies are intentionally defined on analytics_events or any private
-- table. Only service_role (BYPASSRLS) and narrowly checked definer functions
-- may access them.

-- ---------------------------------------------------------------------------
-- Explicit Data API privileges
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all tables in schema private to service_role;
grant all on all sequences in schema private to service_role;

grant select on public.professional_types, public.credential_types,
  public.verification_rules, public.needs, public.services, public.specialties,
  public.audiences, public.modalities, public.locations, public.languages,
  public.industries, public.career_stages, public.plans, public.plan_entitlements,
  public.article_categories, public.matching_questions, public.matching_options,
  public.matching_rules to anon, authenticated;

grant insert, update, delete on public.professional_types, public.credential_types,
  public.verification_rules, public.needs, public.services, public.specialties,
  public.audiences, public.modalities, public.locations, public.languages,
  public.industries, public.career_stages, public.plans, public.plan_entitlements,
  public.article_categories, public.matching_questions, public.matching_options,
  public.matching_rules to authenticated;
grant usage, select on sequence public.roles_id_seq, public.matching_rules_id_seq
  to authenticated;

grant select on public.roles to authenticated;
grant insert, update, delete on public.roles to authenticated;
grant select (user_id, role_id, created_at) on public.user_roles to authenticated;
grant insert, update, delete on public.user_roles to authenticated;
grant select on public.user_profiles to authenticated;
grant update (display_name, avatar_path, locale, marketing_consent)
  on public.user_profiles to authenticated;

grant select (
  id, slug, first_name, last_name, pronouns, avatar_path, headline, bio, approach,
  experience_summary, education_summary, years_experience, starting_price,
  currency, show_starting_price, availability_status, next_available_on,
  availability_note, linkedin_url, website_url, instagram_url,
  publication_status, published_at, is_accepting_leads,
  is_demo, search_vector, created_at, updated_at
) on public.professional_profiles to anon, authenticated;
grant insert (
  user_id, slug, first_name, last_name, pronouns, avatar_path, headline, bio,
  approach, experience_summary, education_summary, years_experience,
  starting_price, currency, show_starting_price, availability_status,
  next_available_on, availability_note, linkedin_url, website_url, instagram_url,
  is_accepting_leads
) on public.professional_profiles to authenticated;
grant update (
  slug, first_name, last_name, pronouns, avatar_path, headline, bio, approach,
  experience_summary, education_summary, years_experience, starting_price,
  currency, show_starting_price, availability_status, next_available_on,
  availability_note, linkedin_url, website_url, instagram_url, is_accepting_leads
) on public.professional_profiles to authenticated;
grant delete on public.professional_profiles to authenticated;

grant select on public.professional_profile_types, public.professional_needs,
  public.professional_services, public.professional_specialties,
  public.professional_audiences, public.professional_modalities,
  public.professional_locations, public.professional_languages,
  public.professional_industries, public.professional_career_stages,
  public.professional_availability to anon, authenticated;
grant insert, update, delete on public.professional_profile_types, public.professional_needs,
  public.professional_services, public.professional_specialties,
  public.professional_audiences, public.professional_modalities,
  public.professional_locations, public.professional_languages,
  public.professional_industries, public.professional_career_stages,
  public.professional_availability to authenticated;

grant select on public.professional_ranking_signals to anon, authenticated;
grant insert, update, delete on public.professional_ranking_signals to authenticated;
grant select on public.professional_metrics_daily to authenticated;

grant select (
  id, professional_profile_id, need_id, status, source, campaign, utm_source,
  utm_medium, utm_campaign, landing_path, plan_code_snapshot, viewed_at,
  contacted_at, closed_at, is_demo, created_at, updated_at
) on public.leads to authenticated;

grant select (
  id, professional_profile_id, lead_id, reviewer_display_name, rating, title,
  body, status, moderated_at, is_demo, created_at, updated_at
) on public.reviews to anon, authenticated;
grant insert (
  professional_profile_id, lead_id, reviewer_display_name, rating, title, body
) on public.reviews to authenticated;

grant select, insert, delete on public.favorites to authenticated;
grant select on public.subscriptions to authenticated;

grant select (
  id, author_profile_id, category_id, title, slug, excerpt, body, tags, status,
  seo_title, seo_description, canonical_url, published_at, is_demo, created_at, updated_at
) on public.articles to anon, authenticated;
grant insert (
  author_profile_id, category_id, title, slug, excerpt, body, tags,
  seo_title, seo_description, canonical_url
) on public.articles to authenticated;
grant update (
  category_id, title, slug, excerpt, body, tags, seo_title, seo_description, canonical_url
) on public.articles to authenticated;
grant delete on public.articles to authenticated;

grant select on public.institutions, public.agreements,
  public.agreement_professionals, public.agreement_services to anon, authenticated;
grant insert, update, delete on public.institutions, public.agreements,
  public.agreement_professionals, public.agreement_services to authenticated;

grant select on public.matching_sessions, public.matching_answers,
  public.matching_recommendations to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.professional_directory, public.professional_profile_statuses
  to anon, authenticated;

-- Re-grant the narrow RPCs after table-wide privilege cleanup.
grant execute on function public.rank_professionals(
  uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid[],
  numeric, text, text, integer
) to anon, authenticated, service_role;
grant execute on function public.explain_matching(uuid[]) to anon, authenticated, service_role;
grant execute on function public.submit_professional_profile(uuid) to authenticated, service_role;
grant execute on function public.accept_current_terms(text) to authenticated, service_role;
grant execute on function public.accept_terms_from_signup_backend(uuid, text)
  to service_role;
grant execute on function public.bootstrap_first_superadmin_from_backend(uuid)
  to service_role;
grant execute on function public.select_professional_plan(uuid, text) to authenticated, service_role;
grant execute on function public.submit_professional_credential(uuid, uuid, text, text, text, text, text, date, date)
  to authenticated, service_role;
grant execute on function public.my_credential_statuses() to authenticated, service_role;
grant execute on function public.my_professional_profile() to authenticated, service_role;
grant execute on function public.my_professional_leads(uuid, timestamptz, integer)
  to authenticated, service_role;
grant execute on function public.update_professional_lead_status(uuid, text)
  to authenticated, service_role;
grant execute on function public.admin_pending_credentials(timestamptz, integer)
  to authenticated, service_role;
grant execute on function public.admin_pending_professional_profiles(integer)
  to authenticated, service_role;
grant execute on function public.admin_resolve_credential(uuid, text, text, date)
  to authenticated, service_role;
grant execute on function public.admin_set_professional_publication(uuid, text, text)
  to authenticated, service_role;
grant execute on function public.consume_rate_limit_from_backend(text, text, integer, integer)
  to service_role;
grant execute on function public.create_lead_from_backend(
  uuid, text, text, text, text, text, text, timestamptz, text,
  uuid, uuid, text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.record_analytics_event_from_backend(
  text, text, uuid, text, text, uuid, uuid, uuid, jsonb, timestamptz
) to service_role;
grant execute on function public.claim_notification_outbox_from_backend(text, integer)
  to service_role;
grant execute on function public.complete_notification_outbox_from_backend(bigint, uuid, boolean, text, interval)
  to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from anon, authenticated;
alter default privileges in schema private revoke all on sequences from anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema private grant all on tables to service_role;
alter default privileges in schema private grant all on sequences to service_role;

comment on schema private is 'Unexposed PII, credential, queue, throttling, payment and audit data.';
comment on table public.leads is 'Operational lead shell. Contact PII is stored only in private.lead_contacts.';
comment on table public.professional_ranking_signals is 'Explainable ranking inputs; plan boost is constrained to at most 2 points.';
comment on function public.create_lead_from_backend(
  uuid, text, text, text, text, text, text, timestamptz, text,
  uuid, uuid, text, text, text, text, text, text, text, text
) is 'Service-role-only atomic lead, PII and outbox creation. Pass only server-validated values.';

commit;
